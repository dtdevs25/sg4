const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Pegar o primeiro técnico do banco
    const tecnicos = await prisma.$queryRaw`SELECT id FROM "Tecnico" LIMIT 1`;
    const tId = tecnicos.length > 0 ? tecnicos[0].id : null;
    
    if (!tId) {
      console.log('Nenhum técnico no banco!');
      return;
    }

    // Adicionar as colunas no RelatorioAtividade
    console.log('Adicionando colunas...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "RelatorioAtividade" ADD COLUMN IF NOT EXISTS "empresa" text DEFAULT 'Empresa Teste'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RelatorioAtividade" ADD COLUMN IF NOT EXISTS "projeto" text DEFAULT 'Projeto Teste'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RelatorioAtividade" ADD COLUMN IF NOT EXISTS "tecnicoId" text DEFAULT '${tId}'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RelatorioAtividade" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP`);

    console.log('Sucesso!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
