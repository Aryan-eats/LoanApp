import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function investigate() {
  const client = await pool.connect();
  
  console.log('🔍 Database Investigation\n');
  
  // Check current database name
  const dbResult = await client.query('SELECT current_database(), current_schema()');
  console.log('📦 Current Database:', dbResult.rows[0].current_database);
  console.log('📂 Current Schema:', dbResult.rows[0].current_schema);
  
  // List all schemas
  const schemas = await client.query(`
    SELECT schema_name FROM information_schema.schemata 
    WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'
  `);
  console.log('\n📁 Available Schemas:', schemas.rows.map(r => r.schema_name).join(', '));
  
  // Check tables in public schema with row counts
  console.log('\n📊 Tables in public schema:');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name
  `);
  for (const t of tables.rows) {
    const count = await client.query(`SELECT COUNT(*)::int as c FROM "${t.table_name}"`);
    console.log('  ', t.table_name + ':', count.rows[0].c);
  }
  
  // Check migration history
  console.log('\n📜 Prisma Migration History:');
  try {
    const migrations = await client.query(`
      SELECT migration_name, started_at, finished_at 
      FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5
    `);
    migrations.rows.forEach(m => console.log('  ', m.migration_name, '-', m.finished_at));
  } catch {
    console.log('  No migration table found');
  }
  
  // Check for any data modification timestamps
  console.log('\n🕐 Recent activity check:');
  try {
    const latestUser = await client.query('SELECT MAX(created_at) as last FROM users');
    console.log('  Last user created:', latestUser.rows[0].last || 'No users');
  } catch {
    console.log('  Could not check users table');
  }
  
  try {
    const latestLead = await client.query('SELECT MAX(created_at) as last FROM leads');
    console.log('  Last lead created:', latestLead.rows[0].last || 'No leads');
  } catch {
    console.log('  Could not check leads table');
  }
  
  client.release();
  await pool.end();
}

investigate().catch(console.error);
