import { PrismaClient, Role, TipoAtividade, Mes, Semana } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // 1. Limpar banco existente (cuidado com ordem de dependências)
  await prisma.programacao.deleteMany()
  await prisma.atividade.deleteMany()
  await prisma.tecnico.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // 2. Criar senha forte criptografada para o Admin
  const adminPassword = await bcrypt.hash('SG4tst2026!', 12)
  
  const admin = await prisma.user.create({
    data: {
      name: 'Gestor Geral SG4',
      email: 'admin@sg4.com.br',
      password: adminPassword,
      role: Role.ADMIN,
      active: true,
    }
  })
  console.log('✅ Usuário admin criado: admin@sg4.com.br (Senha: SG4tst2026!)')

  // 3. Cadastrar os 10 técnicos reais da planilha
  const tecnicosData = [
    { nome: 'Antonio Carlos Junior Dias', email: 'antonio.dias@sg4.com.br', admissao: new Date('2025-08-05') },
    { nome: 'Daniel José Gregorio Junior', email: 'daniel.junior@sg4.com.br', admissao: new Date('2025-08-05') },
    { nome: 'Dara Amorim Silva de Lima', email: 'dara.lima@sg4.com.br', admissao: new Date('2026-03-23') },
    { nome: 'Djonatê Cruz dos Santos', email: 'djonate.santos@sg4.com.br', admissao: new Date('2025-08-05') },
    { nome: 'Jonas Rodrigues Pereira', email: 'jonas.pereira@sg4.com.br', admissao: new Date('2025-09-18') },
    { nome: 'Karine Novaes Assem', email: 'karine.assem@sg4.com.br', admissao: new Date('2025-08-05') },
    { nome: 'Luis Claudio Soares', email: 'luis.soares@sg4.com.br', admissao: new Date('2026-02-02') },
    { nome: 'Rogério Lima da Silva', email: 'rogerio.silva@sg4.com.br', admissao: new Date('2025-04-12') },
    { nome: 'Rosicleide Fernandes Santos Davino', email: 'rosicleide.davino@sg4.com.br', admissao: new Date('2025-08-05') },
    { nome: 'Samuel da Silva Santos', email: 'samuel.santos@sg4.com.br', admissao: new Date('2025-08-05') },
  ]

  const dbTecnicos = []
  for (const t of tecnicosData) {
    const dbTec = await prisma.tecnico.create({
      data: {
        nome: t.nome,
        email: t.email,
        admissao: t.admissao,
        cargo: 'Técnico de Segurança do Trabalho',
        ativo: true,
      }
    })
    dbTecnicos.push(dbTec)
  }
  console.log(`✅ ${dbTecnicos.length} técnicos cadastrados.`)

  // 4. Inserir dados reais consolidados de Janeiro a Abril de 2026
  // Meta DSS: 8 por mês | Meta Inspeção: 20 por mês
  const meses = [Mes.JANEIRO, Mes.FEVEREIRO, Mes.MARCO, Mes.ABRIL]
  
  // Realizados reais aproximados por técnico e mês conforme planilha
  const dssRealizados: Record<string, number[]> = {
    'Antonio Carlos Junior Dias': [8, 8, 8, 8],
    'Daniel José Gregorio Junior': [8, 8, 8, 20],
    'Dara Amorim Silva de Lima': [0, 0, 0, 3],
    'Djonatê Cruz dos Santos': [8, 8, 8, 3],
    'Jonas Rodrigues Pereira': [9, 8, 8, 3],
    'Karine Novaes Assem': [8, 9, 13, 10],
    'Luis Claudio Soares': [0, 3, 8, 8],
    'Rogério Lima da Silva': [9, 8, 9, 3],
    'Rosicleide Fernandes Santos Davino': [16, 14, 18, 14],
    'Samuel da Silva Santos': [0, 2, 0, 2],
  }

  const inspRealizadas: Record<string, number[]> = {
    'Antonio Carlos Junior Dias': [20, 20, 16, 18],
    'Daniel José Gregorio Junior': [23, 22, 25, 22],
    'Dara Amorim Silva de Lima': [0, 0, 0, 5],
    'Djonatê Cruz dos Santos': [20, 21, 20, 5],
    'Jonas Rodrigues Pereira': [20, 20, 21, 21],
    'Karine Novaes Assem': [20, 22, 20, 21],
    'Luis Claudio Soares': [0, 1, 19, 21],
    'Rogério Lima da Silva': [20, 20, 20, 0],
    'Rosicleide Fernandes Santos Davino': [25, 21, 24, 18],
    'Samuel da Silva Santos': [0, 2, 0, 2],
  }

  console.log('📈 Gerando histórico de atividades (DSS e Inspeções)...')

  for (const tec of dbTecnicos) {
    const dssMeses = dssRealizados[tec.nome] || [0,0,0,0]
    const inspMeses = inspRealizadas[tec.nome] || [0,0,0,0]

    for (let idx = 0; idx < meses.length; idx++) {
      const mes = meses[idx]

      // Lançamento do DSS
      await prisma.atividade.create({
        data: {
          tecnicoId: tec.id,
          tipo: TipoAtividade.DSS,
          ano: 2026,
          mes,
          semana: Semana.S1, // Agrupado em S1 para visualização consolidada simplificada
          meta: 8,
          realizado: dssMeses[idx],
        }
      })

      // Lançamento da Inspeção
      await prisma.atividade.create({
        data: {
          tecnicoId: tec.id,
          tipo: TipoAtividade.INSPECAO,
          ano: 2026,
          mes,
          semana: Semana.S1,
          meta: 20,
          realizado: inspMeses[idx],
        }
      })
    }
  }

  console.log('🌱 Seed concluído com extremo sucesso! Banco pronto para produção.')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
