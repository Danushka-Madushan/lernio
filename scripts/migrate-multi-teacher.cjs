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

async function run() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL not found.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('--- Starting Multi-Teacher Schema & Data Migration ---');
    await client.query('BEGIN');

    // 1. Create StudentTeacher table
    console.log('1. Creating StudentTeacher table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "StudentTeacher" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "teacherId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "StudentTeacher_pkey" PRIMARY KEY ("id")
      );
    `);

    // 2. Add foreign keys
    console.log('2. Ensuring foreign key constraints...');
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentTeacher_studentId_fkey') THEN
          ALTER TABLE "StudentTeacher" ADD CONSTRAINT "StudentTeacher_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentTeacher_teacherId_fkey') THEN
          ALTER TABLE "StudentTeacher" ADD CONSTRAINT "StudentTeacher_teacherId_fkey"
          FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 3. Unique & performance indexes
    console.log('3. Ensuring indexes...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "StudentTeacher_studentId_teacherId_key" ON "StudentTeacher"("studentId", "teacherId");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "StudentTeacher_studentId_idx" ON "StudentTeacher"("studentId");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "StudentTeacher_teacherId_idx" ON "StudentTeacher"("teacherId");
    `);

    // 4. Data migration: copy existing User.teacherId for all students
    console.log('4. Migrating existing student-teacher relations...');
    const migrateRes = await client.query(`
      INSERT INTO "StudentTeacher" ("id", "studentId", "teacherId", "createdAt")
      SELECT 
        gen_random_uuid()::text, 
        u."id", 
        u."teacherId", 
        NOW() 
      FROM "User" u
      WHERE u.role = 'STUDENT' 
        AND u."teacherId" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "User" t WHERE t."id" = u."teacherId")
      ON CONFLICT ("studentId", "teacherId") DO NOTHING;
    `);

    console.log(`Migrated / ensured ${migrateRes.rowCount} student-teacher relations in StudentTeacher table.`);

    const countRes = await client.query(`SELECT COUNT(*)::int as total FROM "StudentTeacher"`);
    console.log(`Total rows in StudentTeacher now: ${countRes.rows[0].total}`);

    await client.query('COMMIT');
    console.log('--- Migration committed successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
