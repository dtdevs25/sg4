const { db } = require('./src/lib/db');
async function run() {
  try {
    await db.abastecimento.delete({
      where: { id: 'cmr785yay000401oaiatzwxzv' }
    });
    console.log('Registro apagado com sucesso!');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await db.$disconnect();
  }
}
run();
