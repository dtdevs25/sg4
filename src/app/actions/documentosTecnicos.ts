'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'
import { sendMail } from '@/lib/mail'

// Bucket para documentos de técnicos (fallback se não houver variável dedicada)
const BUCKET_DOCUMENTOS = process.env.S3_BUCKET_DOCUMENTOS || 'sg4-docststs'

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

    let tipos = await prisma.tipoDocumentoTecnico.findMany({
      orderBy: { nome: 'asc' },
    })

    if (tipos.length === 0) {
      await seedTiposDocumentosIniciais()
      tipos = await prisma.tipoDocumentoTecnico.findMany({
        orderBy: { nome: 'asc' },
      })
    }

    return { success: true, data: tipos }
  } catch (error) {
    console.error('Erro ao buscar tipos de documentos:', error)
    return { success: false, error: 'Erro ao buscar tipos de documentos' }
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

export function calcularStatusDocumento(dataVencimento: Date | null, diasAlerta: number = 45): 'VALIDO' | 'A_VENCER' | 'VENCIDO' | 'SEM_VALIDADE' {
  if (!dataVencimento) return 'SEM_VALIDADE'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const venc = new Date(dataVencimento)
  venc.setHours(0, 0, 0, 0)

  const diffTime = venc.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
          select: { id: true, nome: true, email: true, cargo: true, ativo: true, fotoUrl: true, matriculaArkium: true },
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

    const emissaoDate = new Date(dados.dataEmissao)
    let vencimentoDate: Date | null = null

    if (dados.dataVencimento) {
      vencimentoDate = new Date(dados.dataVencimento)
    } else if (tipo.validadeMeses && tipo.validadeMeses > 0) {
      vencimentoDate = new Date(emissaoDate)
      vencimentoDate.setMonth(vencimentoDate.getMonth() + tipo.validadeMeses)
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
          cadastradoPor: userName,
          ultimoAlertaEmail: null, // reseta o alerta pois é uma nova versão
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
    hoje.setHours(0, 0, 0, 0)

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
      venc.setHours(0, 0, 0, 0)

      const diffTime = venc.getTime() - hoje.getTime()
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
      const dataVencFormatada = doc.dataVencimento ? new Date(doc.dataVencimento).toLocaleDateString('pt-BR') : '-'
      const badgeCor = isVencido ? '#ef4444' : '#f59e0b'
      const statusTxt = isVencido ? `VENCIDO (${Math.abs(diasRestantes)} dias atrás)` : `Vence em ${diasRestantes} dias`

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 600; color: #1e293b;">${doc.tecnico.nome}</td>
          <td style="padding: 12px; color: #334155;">${doc.tipoDocumento.nome}</td>
          <td style="padding: 12px; color: #475569;">${dataVencFormatada}</td>
          <td style="padding: 12px;">
            <span style="background: ${badgeCor}; color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
              ${statusTxt}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #660099, #4a0072); padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px;">SG4 - Alerta de Vencimento de Documentos SST</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
            Aviso preventivo (45 dias de antecedência) para técnicos ativos.
          </p>
        </div>
        <div style="padding: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Olá, Administrador(a). Identificamos <strong>${docsParaNotificar.length} documento(s)</strong> que estão próximos do vencimento ou vencidos para colaboradores ativos no sistema SG4:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">
                <th style="padding: 10px 12px;">Técnico</th>
                <th style="padding: 10px 12px;">Documento</th>
                <th style="padding: 10px 12px;">Vencimento</th>
                <th style="padding: 10px 12px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
            Acesse o menu <strong>Administração &gt; Documentos dos Técnicos</strong> no SG4 para anexar os novos arquivos e manter o histórico atualizado.
          </div>
        </div>
      </div>
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
