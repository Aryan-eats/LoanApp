import 'dotenv/config';
import { Pool } from 'pg';

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...\n');
  
  const dbUrl = process.env.DATABASE_URL;
  console.log('Connection URL (masked):', dbUrl?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET');
  
  // Test raw pg connection
  const pool = new Pool({
    connectionString: dbUrl,
  });
  
  try {
    console.log('\n⏳ Connecting to PostgreSQL...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ PostgreSQL connection successful!');
    console.log(`   Current DB time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
    
    // Get table counts
    console.log('\n📊 Table record counts:');
    
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    for (const row of tablesQuery.rows) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
      console.log(`   ${row.table_name}: ${countResult.rows[0].count}`);
    }
    
    client.release();
    console.log('\n✅ All database checks passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
