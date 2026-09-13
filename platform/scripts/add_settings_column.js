const { Pool } = require('pg')

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query('ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT \'{}\';')
    console.log('Successfully ensured settings column in Restaurant table')
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await pool.end()
  }
}

run()
