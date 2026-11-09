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

async function verify() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const studentRes = await client.query(`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'STUDENT'`);
    const stRes = await client.query(`SELECT COUNT(*)::int as count FROM "StudentTeacher"`);
    const unlinkedRes = await client.query(`
      SELECT COUNT(*)::int as count 
      FROM "User" u 
      WHERE u.role = 'STUDENT' 
        AND NOT EXISTS (SELECT 1 FROM "StudentTeacher" st WHERE st."studentId" = u.id)
    `);

    console.log('--- Transition Integrity Verification ---');
    console.log(`Total Student accounts      : ${studentRes.rows[0].count}`);
    console.log(`Total StudentTeacher records: ${stRes.rows[0].count}`);
    console.log(`Unlinked Students           : ${unlinkedRes.rows[0].count}`);

    if (unlinkedRes.rows[0].count === 0) {
      console.log('✅ 100% of students have their teacher assignments active in StudentTeacher table!');
    } else {
      console.log('⚠️ Some students are unlinked.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
