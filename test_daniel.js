const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dss = await prisma.dssArkium.findMany({
    where: {
      OR: [
        { lider: { contains: 'Daniel' } },
        { nome: { contains: 'Daniel' } }
      ]
    },
    select: {
      numeroDialogo: true,
      lider: true,
      nome: true,
      dataFechamento: true
    }
  });
  console.log(JSON.stringify(dss, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
