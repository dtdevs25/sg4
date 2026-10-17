'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'
import { sendMail } from '@/lib/mail'

// Bucket para documentos de técnicos (fallback se não houver variável dedicada)
const BUCKET_DOCUMENTOS = process.env.S3_BUCKET_DOCUMENTOS || 'sg4-docststs'

// ─── HELPERS DE DATAS E ARQUIVOS (PREVENÇÃO DE ERROS DE FUSO E ANEXOS) ───

// Salva datas estritamente ao meio-dia UTC (12:00:00Z) para que em qualquer fuso brasileiro (UTC-2 a UTC-5)
// a data de calendário permaneça exatamente a mesma (das 07:00 às 10:00 da manhã)
function parseDataSegura(val?: string | Date | null): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  const str = String(val).trim()
  if (!str) return null
  const apenasData = str.split('T')[0]
  if (apenasData.includes('-')) {
    const partes = apenasData.split('-').map(Number)
    if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
      return new Date(Date.UTC(partes[0], partes[1] - 1, partes[2], 12, 0, 0))
    }
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

// Calcula vencimento adicionando meses sem alterar o fuso horário
function calcularDataVencimentoPorMeses(dataEmissaoStr: string, meses: number): Date {
  const apenasData = dataEmissaoStr.split('T')[0]
  const partes = apenasData.split('-').map(Number)
  if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
    return new Date(Date.UTC(partes[0], partes[1] - 1 + meses, partes[2], 12, 0, 0))
  }
  const d = new Date(dataEmissaoStr)
  d.setMonth(d.getMonth() + meses)
  return d
}

// Formata data para exibição em pt-BR (DD/MM/AAAA) sem desvio de fuso
function formatarDataBrSegura(val?: string | Date | null): string {
  if (!val) return '—'
  const str = String(val).split('T')[0]
  if (str.includes('-')) {
    const [y, m, d] = str.split('-')
    if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// Obtém o Buffer de um arquivo para anexar diretamente em e-mails
async function getArquivoBuffer(url: string, bucket: string = BUCKET_DOCUMENTOS): Promise<Buffer | null> {
  try {
    const marker = `/${bucket}/`
    let key = ''
    if (url.includes(marker)) {
      key = decodeURIComponent(url.split(marker)[1])
    } else {
      const parts = url.split('/')
      key = decodeURIComponent(parts.slice(-2).join('/'))
    }

    if (key) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
        const res = await s3Client.send(cmd)
        if (res.Body) {
          const bytes = await res.Body.transformToByteArray()
          return Buffer.from(bytes)
        }
      } catch (s3Err) {
        console.warn('Tentativa direta via SDK falhou, usando fallback HTTP:', s3Err)
      }
    }

    const resp = await fetch(url)
    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }
    return null
  } catch (e) {
    console.error('Erro ao baixar arquivo para anexo de e-mail:', e)
    return null
  }
}

// Seed inicial dos tipos de documentos padrão caso a tabela esteja vazia
export async function seedTiposDocumentosIniciais() {
  const padroes = [
    { nome: 'Ficha de EPI', descricao: 'Comprovante de entrega e termo de responsabilidade de EPI', validadeMeses: 12, diasAlerta: 45, obrigatorio: true },
    { nome: 'ASO (Atestado de Saúde Ocupacional)', descricao: 'ASO Periódico / Admissional do colaborador', validadeMeses: 12, diasAlerta: 45, obrigatorio: true },
    { nome: 'Treinamento NR-35 (Trabalho em Altura)', descricao: 'Certificado de capacitação ou reciclagem NR-35', validadeMeses: 24, diasAlerta: 45, obrigatorio: true },
    { nome: 'Treinamento NR-33 (Espaço Confinado)', descricao: 'Certificado de capacitação ou reciclagem NR-33', validadeMeses: 12, diasAlerta: 45, obrigatorio: true },
    { nome: 'Treinamento NR-10 (Segurança em Eletricidade)', descricao: 'Certificado básico ou reciclagem NR-10', validadeMeses: 24, diasAlerta: 45, obrigatorio: false },
    { nome: 'Treinamento NR-10 SEP', descricao: 'Certificado complementar SEP', validadeMeses: 24, diasAlerta: 45, obrigatorio: false },
    { nome: 'CNH (Carteira Nacional de Habilitação)', descricao: 'Documento de habilitação para condução de veículos da empresa', validadeMeses: null, diasAlerta: 45, obrigatorio: true },
    { nome: 'Registro Profissional (MTE/CFT)', descricao: 'Comprovante de registro profissional de TST', validadeMeses: null, diasAlerta: 45, obrigatorio: true },
  ]

  for (const item of padroes) {
    const existe = await prisma.tipoDocumentoTecnico.findUnique({
      where: { nome: item.nome },
    })
    if (!existe) {
      await prisma.tipoDocumentoTecnico.create({
        data: item,
      })
    }
  }
}

// ─── TIPOS DE DOCUMENTO (CRUD) ───

export async function getTiposDocumentos() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const tipos = await prisma.tipoDocumentoTecnico.findMany({
      orderBy: { nome: 'asc' },
    })

    return { success: true, data: tipos }
  } catch (error) {
    console.error('Erro ao buscar tipos de documentos:', error)
    return { success: false, error: 'Erro ao buscar tipos de documentos' }
  }
}

export async function deleteTipoDocumento(id: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    // Verificar se há documentos usando este tipo
    const emUso = await prisma.documentoTecnico.count({
      where: { tipoDocumentoId: id }
    })
    if (emUso > 0) {
      return { success: false, error: `Não é possível excluir: existem ${emUso} documento(s) associado(s) a este tipo.` }
    }

    const deletado = await prisma.tipoDocumentoTecnico.delete({
      where: { id }
    })

    await audit({
      userId: session?.user?.id,
      action: 'EXCLUIR_TIPO_DOCUMENTO_TECNICO',
      entity: 'TipoDocumentoTecnico',
      entityId: id,
      details: { nome: deletado.nome }
    })

    return { success: true, data: deletado }
  } catch (error) {
    console.error('Erro ao excluir tipo de documento:', error)
    return { success: false, error: 'Erro ao excluir tipo de documento' }
  }
}

export async function createTipoDocumento(data: {
  nome: string
  descricao?: string
  validadeMeses?: number | null
  diasAlerta?: number
  obrigatorio?: boolean
}) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    if (!data.nome?.trim()) return { success: false, error: 'Nome é obrigatório' }

    const criado = await prisma.tipoDocumentoTecnico.create({
      data: {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        validadeMeses: data.validadeMeses !== undefined && data.validadeMeses !== null && data.validadeMeses > 0 ? Number(data.validadeMeses) : null,
        diasAlerta: data.diasAlerta ? Number(data.diasAlerta) : 45,
        obrigatorio: data.obrigatorio ?? true,
      },
    })

    await audit({
      userId: session?.user?.id,
      action: 'CRIAR_TIPO_DOCUMENTO_TECNICO',
      entity: 'TipoDocumentoTecnico',
      entityId: criado.id,
      details: { nome: criado.nome },
    })

    return { success: true, data: criado }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'Já existe um tipo de documento com este nome.' }
    }
    console.error('Erro ao criar tipo de documento:', error)
    return { success: false, error: 'Erro ao criar tipo de documento' }
  }
}

export async function updateTipoDocumento(id: string, data: {
  nome: string
  descricao?: string
  validadeMeses?: number | null
  diasAlerta?: number
  obrigatorio?: boolean
  ativo?: boolean
}) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    const atualizado = await prisma.tipoDocumentoTecnico.update({
      where: { id },
      data: {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        validadeMeses: data.validadeMeses !== undefined && data.validadeMeses !== null && data.validadeMeses > 0 ? Number(data.validadeMeses) : null,
        diasAlerta: data.diasAlerta ? Number(data.diasAlerta) : 45,
        obrigatorio: data.obrigatorio ?? true,
        ativo: data.ativo ?? true,
      },
    })

    await audit({
      userId: session?.user?.id,
      action: 'ATUALIZAR_TIPO_DOCUMENTO_TECNICO',
      entity: 'TipoDocumentoTecnico',
      entityId: atualizado.id,
      details: { nome: atualizado.nome },
    })

    return { success: true, data: atualizado }
  } catch (error) {
    console.error('Erro ao atualizar tipo de documento:', error)
    return { success: false, error: 'Erro ao atualizar tipo de documento' }
  }
}

// ─── UPLOAD DE DOCUMENTO PARA O S3 / MinIO ───

export async function uploadArquivoDocumento(formData: FormData) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado para upload de documentos.' }
    }

    const fileData = formData.get('fileData') as string
    const fileName = formData.get('fileName') as string
    const contentType = formData.get('contentType') as string

    if (!fileData || !fileName) return { success: false, error: 'Arquivo inválido' }

    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData
    const buffer = Buffer.from(base64Data, 'base64')
    const ext = fileName.split('.').pop() || 'pdf'
    const safeBaseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `documentos-tecnicos/${Date.now()}-${Math.random().toString(36).substring(7)}-${safeBaseName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_DOCUMENTOS,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/pdf',
      ACL: 'public-read',
    })

    await s3Client.send(command)

    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/${BUCKET_DOCUMENTOS}/${key}`

    return {
      success: true,
      url,
      fileName,
      sizeBytes: buffer.length,
    }
  } catch (error) {
    console.error('Erro ao fazer upload do documento no S3:', error)
    return { success: false, error: 'Erro ao fazer upload do arquivo no servidor de arquivos.' }
  }
}

// ─── CÁLCULO DE STATUS ───

function calcularStatusDocumento(dataVencimento: Date | null, diasAlerta: number = 45): 'VALIDO' | 'A_VENCER' | 'VENCIDO' | 'SEM_VALIDADE' {
  if (!dataVencimento) return 'SEM_VALIDADE'

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)

  const venc = new Date(dataVencimento)
  venc.setHours(12, 0, 0, 0)

  const diffTime = venc.getTime() - hoje.getTime()
  const diffDias = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return 'VENCIDO'
  if (diffDias <= diasAlerta) return 'A_VENCER'
  return 'VALIDO'
}

// ─── DOCUMENTOS DOS TÉCNICOS (LISTAGEM & FILTROS) ───

export async function getDocumentosTecnicos(filtros?: {
  tecnicoId?: string
  tipoDocumentoId?: string
  status?: string
  apenasAtivos?: boolean
  busca?: string
}) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    const where: any = {}

    // Filtra técnicos ativos por padrão ou conforme filtro
    if (filtros?.apenasAtivos !== false) {
      where.tecnico = { ativo: true }
    }

    if (filtros?.tecnicoId && filtros.tecnicoId !== 'todos') {
      where.tecnicoId = filtros.tecnicoId
    }

    if (filtros?.tipoDocumentoId && filtros.tipoDocumentoId !== 'todos') {
      where.tipoDocumentoId = filtros.tipoDocumentoId
    }

    if (filtros?.busca) {
      where.OR = [
        { titulo: { contains: filtros.busca, mode: 'insensitive' } },
        { arquivoNome: { contains: filtros.busca, mode: 'insensitive' } },
        { tecnico: { nome: { contains: filtros.busca, mode: 'insensitive' } } },
        { tipoDocumento: { nome: { contains: filtros.busca, mode: 'insensitive' } } },
      ]
    }

    const documentos = await prisma.documentoTecnico.findMany({
      where,
      include: {
        tecnico: {
          select: { id: true, nome: true, email: true, cargo: true, ativo: true, fotoUrl: true, matriculaArkium: true, admissao: true },
        },
        tipoDocumento: true,
        historico: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { dataVencimento: 'asc' },
      ],
    })

    // Recalcula o status dinamicamente de acordo com a data de hoje
    const docsComStatusAtualizado = documentos.map(doc => {
      const statusCalculado = calcularStatusDocumento(
        doc.dataVencimento ? new Date(doc.dataVencimento) : null,
        doc.tipoDocumento?.diasAlerta || 45
      )
      return {
        ...doc,
        status: statusCalculado,
      }
    })

    // Filtra por status se solicitado
    const filtrados = filtros?.status && filtros.status !== 'todos'
      ? docsComStatusAtualizado.filter(d => d.status === filtros.status)
      : docsComStatusAtualizado

    return { success: true, data: filtrados }
  } catch (error) {
    console.error('Erro ao buscar documentos dos técnicos:', error)
    return { success: false, error: 'Erro ao buscar documentos' }
  }
}

// ─── SALVAR / CRIAR DOCUMENTO DO TÉCNICO ───

export async function salvarDocumentoTecnico(dados: {
  tecnicoId: string
  tipoDocumentoId: string
  titulo?: string
  arquivoUrl: string
  arquivoNome: string
  arquivoTamanho?: number
  dataEmissao: string
  dataVencimento?: string | null
  observacoes?: string
  itensEpi?: Array<{
    nome: string
    validadeMeses: number
    dataEntrega: string
    dataVencimento: string
  }>
}) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    const userName = session?.user?.name || 'Administrador'
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    if (!dados.tecnicoId) return { success: false, error: 'Técnico é obrigatório' }
    if (!dados.tipoDocumentoId) return { success: false, error: 'Tipo de documento é obrigatório' }
    if (!dados.arquivoUrl) return { success: false, error: 'Arquivo do documento é obrigatório' }
    if (!dados.dataEmissao) return { success: false, error: 'Data de emissão é obrigatória' }

    // Busca tipo para pegar validade padrão se a data de vencimento não foi passada
    const tipo = await prisma.tipoDocumentoTecnico.findUnique({
      where: { id: dados.tipoDocumentoId },
    })

    if (!tipo) return { success: false, error: 'Tipo de documento não encontrado' }

    // Converte data de emissão de forma segura sem desvio de fuso
    const emissaoDate = parseDataSegura(dados.dataEmissao)
    if (!emissaoDate) return { success: false, error: 'Data de emissão inválida' }

    let vencimentoDate: Date | null = null

    // Regra da Ficha de EPI: se tiver itens individuais de EPI, a ficha vence na data do item que vencer PRIMEIRO (menor data de vencimento)
    if (dados.itensEpi && dados.itensEpi.length > 0) {
      const datasItens = dados.itensEpi
        .map(it => it.dataVencimento ? parseDataSegura(it.dataVencimento)?.getTime() : null)
        .filter((t): t is number => typeof t === 'number' && !isNaN(t))

      if (datasItens.length > 0) {
        const menorTimestamp = Math.min(...datasItens)
        vencimentoDate = new Date(menorTimestamp)
      }
    }

    if (!vencimentoDate) {
      if (dados.dataVencimento) {
        vencimentoDate = parseDataSegura(dados.dataVencimento)
      } else if (tipo.validadeMeses && tipo.validadeMeses > 0) {
        vencimentoDate = calcularDataVencimentoPorMeses(dados.dataEmissao, Number(tipo.validadeMeses))
      }
    }

    const statusCalculado = calcularStatusDocumento(vencimentoDate, tipo.diasAlerta || 45)

    // Verifica se já existe um documento deste tipo para o técnico
    const documentoExistente = await prisma.documentoTecnico.findFirst({
      where: {
        tecnicoId: dados.tecnicoId,
        tipoDocumentoId: dados.tipoDocumentoId,
      },
    })

    let resultado

    if (documentoExistente) {
      // 1. Move a versão atual para o histórico para preservar versões antigas
      await prisma.documentoTecnicoHistorico.create({
        data: {
          documentoTecnicoId: documentoExistente.id,
          arquivoUrl: documentoExistente.arquivoUrl,
          arquivoNome: documentoExistente.arquivoNome,
          arquivoTamanho: documentoExistente.arquivoTamanho,
          dataEmissao: documentoExistente.dataEmissao,
          dataVencimento: documentoExistente.dataVencimento,
          modificadoPor: userName,
          motivoSubstituicao: dados.observacoes || 'Atualização/Renovação de documento',
        },
      })

      // 2. Atualiza o documento principal com a nova versão
      resultado = await prisma.documentoTecnico.update({
        where: { id: documentoExistente.id },
        data: {
          titulo: dados.titulo?.trim() || null,
          arquivoUrl: dados.arquivoUrl,
          arquivoNome: dados.arquivoNome,
          arquivoTamanho: dados.arquivoTamanho || null,
          dataEmissao: emissaoDate,
          dataVencimento: vencimentoDate,
          status: statusCalculado,
          observacoes: dados.observacoes?.trim() || null,
          itensEpi: dados.itensEpi || undefined,
          cadastradoPor: userName,
          ultimoAlertaEmail: null,
        },
        include: {
          tecnico: { select: { nome: true } },
          tipoDocumento: { select: { nome: true } },
        },
      })

      await audit({
        userId: session?.user?.id,
        action: 'RENOVAR_DOCUMENTO_TECNICO',
        entity: 'DocumentoTecnico',
        entityId: resultado.id,
        details: {
          tecnico: resultado.tecnico.nome,
          tipo: resultado.tipoDocumento.nome,
          arquivo: dados.arquivoNome,
        },
      })
    } else {
      // Criação do primeiro registro
      resultado = await prisma.documentoTecnico.create({
        data: {
          tecnicoId: dados.tecnicoId,
          tipoDocumentoId: dados.tipoDocumentoId,
          titulo: dados.titulo?.trim() || null,
          arquivoUrl: dados.arquivoUrl,
          arquivoNome: dados.arquivoNome,
          arquivoTamanho: dados.arquivoTamanho || null,
          dataEmissao: emissaoDate,
          dataVencimento: vencimentoDate,
          status: statusCalculado,
          observacoes: dados.observacoes?.trim() || null,
          itensEpi: dados.itensEpi || undefined,
          cadastradoPor: userName,
        },
        include: {
          tecnico: { select: { nome: true } },
          tipoDocumento: { select: { nome: true } },
        },
      })

      await audit({
        userId: session?.user?.id,
        action: 'CADASTRAR_DOCUMENTO_TECNICO',
        entity: 'DocumentoTecnico',
        entityId: resultado.id,
        details: {
          tecnico: resultado.tecnico.nome,
          tipo: resultado.tipoDocumento.nome,
          arquivo: dados.arquivoNome,
        },
      })
    }

    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao salvar documento do técnico:', error)
    return { success: false, error: 'Erro ao salvar documento do técnico' }
  }
}

// ─── EDITAR / ATUALIZAR DADOS DO DOCUMENTO DO TÉCNICO ───

export async function atualizarDocumentoTecnico(dados: {
  id: string
  titulo?: string
  dataEmissao: string
  dataVencimento?: string | null
  observacoes?: string
  arquivoUrl?: string
  arquivoNome?: string
  arquivoTamanho?: number
  itensEpi?: Array<{
    nome: string
    validadeMeses: number
    dataEntrega: string
    dataVencimento: string
  }>
}) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    const userName = session?.user?.name || 'Administrador'
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    if (!dados.id) return { success: false, error: 'ID do documento é obrigatório' }
    if (!dados.dataEmissao) return { success: false, error: 'Data de emissão é obrigatória' }

    const docExistente = await prisma.documentoTecnico.findUnique({
      where: { id: dados.id },
      include: {
        tipoDocumento: true,
        tecnico: { select: { nome: true } },
      },
    })

    if (!docExistente) return { success: false, error: 'Documento não encontrado' }

    const emissaoDate = parseDataSegura(dados.dataEmissao)
    if (!emissaoDate) return { success: false, error: 'Data de emissão inválida' }

    let vencimentoDate: Date | null = null

    // Regra da Ficha de EPI: se tiver itens individuais de EPI, a ficha vence no item que vencer PRIMEIRO
    if (dados.itensEpi && dados.itensEpi.length > 0) {
      const datasItens = dados.itensEpi
        .map(it => it.dataVencimento ? parseDataSegura(it.dataVencimento)?.getTime() : null)
        .filter((t): t is number => typeof t === 'number' && !isNaN(t))

      if (datasItens.length > 0) {
        vencimentoDate = new Date(Math.min(...datasItens))
      }
    }

    if (!vencimentoDate && dados.dataVencimento) {
      vencimentoDate = parseDataSegura(dados.dataVencimento)
    }

    const diasAlerta = docExistente.tipoDocumento?.diasAlerta || 45
    const statusCalculado = calcularStatusDocumento(vencimentoDate, diasAlerta)

    const updateData: any = {
      titulo: dados.titulo !== undefined ? (dados.titulo?.trim() || null) : docExistente.titulo,
      dataEmissao: emissaoDate,
      dataVencimento: vencimentoDate,
      status: statusCalculado,
      observacoes: dados.observacoes !== undefined ? (dados.observacoes?.trim() || null) : docExistente.observacoes,
    }

    if (dados.itensEpi !== undefined) {
      updateData.itensEpi = dados.itensEpi
    }

    if (dados.arquivoUrl && dados.arquivoNome) {
      updateData.arquivoUrl = dados.arquivoUrl
      updateData.arquivoNome = dados.arquivoNome
      if (dados.arquivoTamanho) updateData.arquivoTamanho = dados.arquivoTamanho
    }

    const resultado = await prisma.documentoTecnico.update({
      where: { id: dados.id },
      data: updateData,
      include: {
        tecnico: { select: { nome: true } },
        tipoDocumento: { select: { nome: true } },
      },
    })

    await audit({
      userId: session?.user?.id,
      action: 'EDITAR_DOCUMENTO_TECNICO',
      entity: 'DocumentoTecnico',
      entityId: resultado.id,
      details: {
        tecnico: resultado.tecnico.nome,
        tipo: resultado.tipoDocumento.nome,
        titulo: resultado.titulo,
        usuario: userName,
      },
    })

    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao atualizar documento do técnico:', error)
    return { success: false, error: 'Erro ao atualizar documento do técnico' }
  }
}

// ─── ENVIAR TODOS OS DOCUMENTOS DO TÉCNICO POR E-MAIL PARA ADMINISTRADORES ───

export async function enviarDocumentosDoTecnicoPorEmail(tecnicoId: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: {
        documentos: {
          include: { tipoDocumento: true },
          orderBy: { dataVencimento: 'asc' },
        },
      },
    })

    if (!tecnico) return { success: false, error: 'Técnico não encontrado' }
    if (tecnico.documentos.length === 0) {
      return { success: false, error: 'Este técnico ainda não possui documentos cadastrados.' }
    }

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MASTER'] },
        active: true,
      },
      select: { email: true, name: true },
    })

    const emailsAdmins = admins.map(a => a.email).filter(Boolean)
    if (emailsAdmins.length === 0) {
      return { success: false, error: 'Nenhum administrador ativo com e-mail encontrado.' }
    }

    // Baixa os arquivos para anexar ao e-mail
    const anexos: Array<{ filename: string; content: Buffer; contentType: string }> = []
    for (const doc of tecnico.documentos) {
      if (!doc.arquivoUrl) continue
      const buf = await getArquivoBuffer(doc.arquivoUrl)
      if (buf) {
        const ext = (doc.arquivoNome.split('.').pop() || 'pdf').toLowerCase()
        let contentType = 'application/pdf'
        if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg'
        if (['png'].includes(ext)) contentType = 'image/png'

        anexos.push({
          filename: doc.arquivoNome || `${doc.tipoDocumento.nome}.${ext}`,
          content: buf,
          contentType,
        })
      }
    }

    const linhasDocs = tecnico.documentos.map(doc => {
      const emissao = formatarDataBrSegura(doc.dataEmissao)
      const venc = doc.dataVencimento ? formatarDataBrSegura(doc.dataVencimento) : 'Sem validade fixa'
      let statusColor = '#059669'
      let statusBg = '#ecfdf5'
      let statusTxt = 'Válido'
      if (doc.status === 'A_VENCER') { statusColor = '#d97706'; statusBg = '#fffbeb'; statusTxt = 'A Vencer' }
      if (doc.status === 'VENCIDO') { statusColor = '#dc2626'; statusBg = '#fef2f2'; statusTxt = 'Vencido' }

      let extraItens = ''
      if (Array.isArray(doc.itensEpi) && doc.itensEpi.length > 0) {
        extraItens = `<div style="margin-top: 3px; font-size: 11px; color: #64748b;">Itens: ${(doc.itensEpi as any[]).map(i => `${i.nome} (Venc: ${formatarDataBrSegura(i.dataVencimento)})`).join(', ')}</div>`
      }

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; font-size: 13px;">
            ${doc.tipoDocumento.nome}
            ${extraItens}
          </td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">${emissao}</td>
          <td style="padding: 10px 12px; color: #334155; font-size: 12px; font-weight: 600;">${venc}</td>
          <td style="padding: 10px 12px; text-align: right;">
            <span style="background: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block;">
              ${statusTxt}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          
          <div style="height: 4px; background: #660099;"></div>

          <div style="padding: 24px 28px 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 15px; font-weight: 800; color: #660099; letter-spacing: 0.5px;">SG4 &bull; GESTÃO</span>
              <span style="font-size: 12px; color: #94a3b8;">${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <h1 style="margin: 14px 0 4px; font-size: 18px; color: #0f172a; font-weight: 700;">Documentação Técnica • ${tecnico.nome}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Admissão: ${formatarDataBrSegura(tecnico.admissao)} &bull; Situação: ${tecnico.ativo ? 'Ativo' : 'Inativo'}
            </p>
          </div>

          <div style="padding: 22px 28px;">
            <p style="margin: 0 0 14px; color: #334155; font-size: 14px; line-height: 1.5;">
              Olá, Administrador(a).
            </p>
            <p style="margin: 0 0 20px; color: #334155; font-size: 14px; line-height: 1.5;">
              Seguem em anexo os <strong>${anexos.length} documento(s)</strong> técnicos de <strong>${tecnico.nome}</strong> (${tecnico.cargo || 'Técnico de Segurança'}).
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Documento</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Emissão</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Vencimento</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: right;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${linhasDocs}
              </tbody>
            </table>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #475569;">
              📎 <strong>${anexos.length} arquivo(s) anexados</strong> a esta mensagem para consulta e download direto.
            </div>
          </div>

          <div style="padding: 14px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
            SG4 Segurança do Trabalho &bull; Notificação automática gerada pelo sistema
          </div>
        </div>
      </body>
      </html>
    `

    for (const email of emailsAdmins) {
      await sendMail({
        to: email,
        subject: `📋 Documentos Técnicos: ${tecnico.nome} (${anexos.length} arquivo(s) em anexo)`,
        html,
        attachments: anexos,
      })
    }

    return {
      success: true,
      message: `Documentos de ${tecnico.nome} enviados com ${anexos.length} anexo(s) para ${emailsAdmins.length} administrador(es)!`,
    }
  } catch (error) {
    console.error('Erro ao enviar documentos do técnico por e-mail:', error)
    return { success: false, error: 'Erro ao enviar documentos do técnico por e-mail' }
  }
}

// ─── EXCLUIR DOCUMENTO ───

export async function deleteDocumentoTecnico(id: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Acesso negado' }

    const doc = await prisma.documentoTecnico.findUnique({
      where: { id },
      include: { tecnico: { select: { nome: true } }, tipoDocumento: { select: { nome: true } } },
    })

    if (!doc) return { success: false, error: 'Documento não encontrado' }

    await prisma.documentoTecnico.delete({ where: { id } })

    await audit({
      userId: session?.user?.id,
      action: 'EXCLUIR_DOCUMENTO_TECNICO',
      entity: 'DocumentoTecnico',
      entityId: id,
      details: { tecnico: doc.tecnico.nome, tipo: doc.tipoDocumento.nome },
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir documento:', error)
    return { success: false, error: 'Erro ao excluir documento' }
  }
}

// ─── NOTIFICAÇÃO POR E-MAIL DE VENCIMENTO (APENAS TÉCNICOS ATIVOS) ───

export async function verificarENotificarDocumentosVencendo() {
  try {
    const hoje = new Date()
    hoje.setHours(12, 0, 0, 0)

    // Busca apenas documentos de técnicos ATIVOS que possuem data de vencimento
    const documentos = await prisma.documentoTecnico.findMany({
      where: {
        tecnico: { ativo: true },
        dataVencimento: { not: null },
      },
      include: {
        tecnico: {
          select: { id: true, nome: true, email: true, ativo: true },
        },
        tipoDocumento: true,
      },
    })

    // Lista de administradores para envio
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MASTER'] },
        active: true,
      },
      select: { email: true, name: true },
    })

    const emailsAdmins = admins.map(a => a.email).filter(Boolean)
    if (emailsAdmins.length === 0) {
      return { success: false, message: 'Nenhum administrador ativo encontrado para receber notificações.' }
    }

    const docsParaNotificar: Array<{
      doc: typeof documentos[0]
      diasRestantes: number
      isVencido: boolean
    }> = []

    for (const doc of documentos) {
      if (!doc.dataVencimento) continue

      const venc = new Date(doc.dataVencimento)
      venc.setHours(12, 0, 0, 0)

      const diffTime = venc.getTime() - hoje.getTime()
      const diffDias = Math.round(diffTime / (1000 * 60 * 60 * 24))
      const diasAlertaConfigurado = doc.tipoDocumento?.diasAlerta || 45

      // Se vence em até diasAlertaConfigurado (ex: 45 dias) ou já venceu
      if (diffDias <= diasAlertaConfigurado) {
        // Evita reenvio diário desnecessário se já foi alertado nos últimos 7 dias
        if (doc.ultimoAlertaEmail) {
          const ultimoEnvio = new Date(doc.ultimoAlertaEmail)
          const diasDesdeUltimoEnvio = Math.floor((hoje.getTime() - ultimoEnvio.getTime()) / (1000 * 60 * 60 * 24))
          if (diasDesdeUltimoEnvio < 7) {
            continue
          }
        }

        docsParaNotificar.push({
          doc,
          diasRestantes: diffDias,
          isVencido: diffDias < 0,
        })
      }
    }

    if (docsParaNotificar.length === 0) {
      return { success: true, count: 0, message: 'Nenhum documento com alerta pendente para hoje.' }
    }

    // Monta tabela visual estilizada para o e-mail
    const linhasHtml = docsParaNotificar.map(({ doc, diasRestantes, isVencido }) => {
      const dataVencFormatada = doc.dataVencimento ? formatarDataBrSegura(doc.dataVencimento) : '-'
      const badgeCor = isVencido ? '#ef4444' : '#f59e0b'
      const statusTxt = isVencido ? `VENCIDO (${Math.abs(diasRestantes)} dias atrás)` : `Vence em ${diasRestantes} dias`

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; font-size: 13px;">${doc.tecnico.nome}</td>
          <td style="padding: 10px 12px; color: #334155; font-size: 13px;">${doc.tipoDocumento.nome}</td>
          <td style="padding: 10px 12px; color: #475569; font-size: 13px;">${dataVencFormatada}</td>
          <td style="padding: 10px 12px; text-align: right;">
            <span style="background: ${badgeCor}; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
              ${statusTxt}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="height: 4px; background: #f59e0b;"></div>
          
          <div style="padding: 24px 28px 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 15px; font-weight: 800; color: #d97706; letter-spacing: 0.5px;">ALERTA SG4</span>
              <span style="font-size: 12px; color: #94a3b8;">${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <h1 style="margin: 14px 0 4px; font-size: 18px; color: #0f172a; font-weight: 700;">Alerta de Vencimento de Documentos SST</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Identificados ${docsParaNotificar.length} documento(s) com validade próxima ou vencida
            </p>
          </div>

          <div style="padding: 22px 28px;">
            <p style="margin: 0 0 16px; color: #334155; font-size: 14px; line-height: 1.5;">
              Olá, Administrador(a). Identificamos <strong>${docsParaNotificar.length} documento(s)</strong> de colaboradores ativos que requerem atenção:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Técnico</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Documento</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Vencimento</th>
                  <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: right;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${linhasHtml}
              </tbody>
            </table>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #475569;">
              Acesse o sistema SG4 em <strong>Administração &gt; Documentos Técnicos</strong> para renovar os arquivos necessários.
            </div>
          </div>

          <div style="padding: 14px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
            SG4 Segurança do Trabalho &bull; Notificação automática preventiva
          </div>
        </div>
      </body>
      </html>
    `

    // Dispara e-mail para todos os administradores
    for (const email of emailsAdmins) {
      await sendMail({
        to: email,
        subject: `⚠️ Alerta SG4: ${docsParaNotificar.length} documento(s) de técnicos a vencer/vencidos`,
        html,
      })
    }

    // Registra que foram notificados para evitar spam
    const idsNotificados = docsParaNotificar.map(item => item.doc.id)
    await prisma.documentoTecnico.updateMany({
      where: { id: { in: idsNotificados } },
      data: { ultimoAlertaEmail: new Date() },
    })

    return {
      success: true,
      count: docsParaNotificar.length,
      destinatarios: emailsAdmins,
      message: `${docsParaNotificar.length} documentos notificados com sucesso para ${emailsAdmins.length} administrador(es).`,
    }
  } catch (error) {
    console.error('Erro na rotina de notificação de documentos:', error)
    return { success: false, error: 'Erro ao processar notificações de vencimento' }
  }
}

// ─── CONSULTAR HISTÓRICO DE ALERTAS E DOCUMENTOS COM NOTIFICAÇÃO PENDENTE ───

export async function getHistoricoAlertasDocumentos() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Documentos já notificados anteriormente (com data de último alerta)
    const jaNotificados = await prisma.documentoTecnico.findMany({
      where: {
        ultimoAlertaEmail: { not: null },
      },
      include: {
        tecnico: { select: { id: true, nome: true, ativo: true } },
        tipoDocumento: true,
      },
      orderBy: { ultimoAlertaEmail: 'desc' },
      take: 50,
    })

    // Documentos elegíveis para envio de alerta agora (técnico ativo, vence em até 45 dias ou vencido)
    const documentosElegiveis = await prisma.documentoTecnico.findMany({
      where: {
        tecnico: { ativo: true },
        dataVencimento: { not: null },
      },
      include: {
        tecnico: { select: { id: true, nome: true, ativo: true } },
        tipoDocumento: true,
      },
      orderBy: { dataVencimento: 'asc' },
    })

    const pendentesAlerta = documentosElegiveis.filter(doc => {
      if (!doc.dataVencimento) return false
      const venc = new Date(doc.dataVencimento)
      venc.setHours(0, 0, 0, 0)
      const diffTime = venc.getTime() - hoje.getTime()
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const diasAlertaConfigurado = doc.tipoDocumento?.diasAlerta || 45

      return diffDias <= diasAlertaConfigurado
    }).map(doc => {
      const venc = new Date(doc.dataVencimento!)
      venc.setHours(0, 0, 0, 0)
      const diffTime = venc.getTime() - hoje.getTime()
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return {
        ...doc,
        diasRestantes: diffDias,
        isVencido: diffDias < 0,
      }
    })

    return {
      success: true,
      data: {
        jaNotificados,
        pendentesAlerta,
      },
    }
  } catch (error) {
    console.error('Erro ao buscar histórico de alertas:', error)
    return { success: false, error: 'Erro ao buscar histórico de alertas' }
  }
}
