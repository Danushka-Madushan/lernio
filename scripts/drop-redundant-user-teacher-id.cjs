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

async function dropRedundantField() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('--- Double-checking Transition Integrity Before Drop ---');
    const studentCount = await client.query(`SELECT count(*)::int as c FROM "User" WHERE role = 'STUDENT'`);
    const stCount = await client.query(`SELECT count(*)::int as c FROM "StudentTeacher"`);
    const unassigned = await client.query(`
      SELECT count(*)::int as c 
      FROM "User" u 
      WHERE u.role = 'STUDENT' 
        AND NOT EXISTS (SELECT 1 FROM "StudentTeacher" st WHERE st."studentId" = u.id)
    `);

    console.log(`Student accounts: ${studentCount.rows[0].c}`);
    console.log(`StudentTeacher links: ${stCount.rows[0].c}`);
    console.log(`Unassigned students: ${unassigned.rows[0].c}`);

    if (unassigned.rows[0].c > 0) {
      throw new Error(`ABORT: Found ${unassigned.rows[0].c} unassigned students! Will not drop column.`);
    }

    console.log('✅ Integrity verified. Proceeding to drop redundant User.teacherId column...');
    await client.query('BEGIN');

    // 1. Drop FK constraint on User if exists
    await client.query(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_teacherId_fkey";
    `);
    console.log('  ✔ Dropped constraint "User_teacherId_fkey" (if existed)');

    // 2. Drop any indexes on User.teacherId
    await client.query(`
      DROP INDEX IF EXISTS "User_teacherId_idx";
    `);
    console.log('  ✔ Dropped index "User_teacherId_idx" (if existed)');

    // 3. Drop teacherId column from User
    await client.query(`
      ALTER TABLE "User" DROP COLUMN IF EXISTS "teacherId";
    `);
    console.log('  ✔ Dropped column "teacherId" from "User" table');

    await client.query('COMMIT');
    console.log('\n✅ Successfully removed redundant User.teacherId field from database!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Operation failed and rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

dropRedundantField();
