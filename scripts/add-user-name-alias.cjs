// scripts/add-user-name-alias.cjs
// Adds nullable `nameAlias` column to table "User" safely.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getDatabaseUrl() {
  const envFiles = ['.env', '.env.local'];
  for (const envFile of envFiles) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const directMatch = content.match(/^DIRECT_URL=(.+)$/m);
      if (directMatch) {
        let val = directMatch[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val;
      }
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
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.error('Missing DIRECT_URL / DATABASE_URL in environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  console.log('Connected to database.');

  try {
    console.log('Adding column "nameAlias" to table "User" if it does not already exist...');
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameAlias" TEXT;`);
    console.log('✅ Column "nameAlias" verified/added successfully.');

    // Verify column exists
    const checkRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'nameAlias';
    `);

    console.log('Column details:', checkRes.rows[0]);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
