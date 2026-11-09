const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getDatabaseUrl() {
  const envFiles = ['.env', '.env.local'];
  for (const envFile of envFiles) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match) {
        let val = match[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val;
      }
    }
  }
  return process.env.DATABASE_URL;
}

async function backup() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL not found in environment or .env files.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Connected to database. Fetching table list...');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables:`, tables.join(', '));

    const backupData = {
      timestamp: new Date().toISOString(),
      tables: {},
      counts: {},
    };

    for (const table of tables) {
      const rowsRes = await client.query(`SELECT * FROM "${table}"`);
      backupData.tables[table] = rowsRes.rows;
      backupData.counts[table] = rowsRes.rowCount;
      console.log(`- Table "${table}": ${rowsRes.rowCount} rows`);
    }

    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log(`\n✅ Backup successfully saved to:\n  ${jsonPath}`);
    console.log('\nSummary of backed-up records:');
    for (const [table, count] of Object.entries(backupData.counts)) {
      console.log(`  ${table.padEnd(25)}: ${count} rows`);
    }

  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

backup();
