import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.naoConformidade.deleteMany({
    where: {
      tecnicoId: null
    }
  })
  console.log(`Limpeza concluída: ${result.count} registros de terceiros foram removidos do banco.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
