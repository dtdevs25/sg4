const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5432/sg4dev?schema=public"
});

async function main() {
  const res = await pool.query('SELECT DISTINCT resultado FROM arkium_aprs');
  console.log('Unique resultado values in DB:', res.rows.map(r => r.resultado));

  const resStatus = await pool.query('SELECT DISTINCT status FROM arkium_aprs');
  console.log('Unique status values in DB:', resStatus.rows.map(r => r.status));
  
  const resCount = await pool.query('SELECT COUNT(*) FROM arkium_aprs');
  console.log('Total APRs in DB:', resCount.rows[0].count);
}

main().catch(console.error).finally(() => pool.end());
