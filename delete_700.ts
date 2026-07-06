import { prisma } from './src/lib/db';
import * as dotenv from 'dotenv';
dotenv.config();
async function run() {
  const result = await prisma.abastecimento.findUnique({
    where: { id: 'cmr785yay000401oaiatzwxzv' }
  });
  console.log(result ? 'Ainda existe!' : 'Nao existe mais!');
  await prisma.$disconnect();
}
run();
