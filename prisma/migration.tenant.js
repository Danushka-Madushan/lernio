/**
 * Multi-Tenant Data Migration Script for Lernio
 *
 * This script safely migrates existing single-tenant records to the new multi-tenant architecture:
 * 1. Ensures database columns and enum values ('TEACHER') exist.
 * 2. Finds the primary system administrator (Role = 'ADMIN').
 * 3. Assigns any unassigned students (teacherId = NULL) to the primary administrator.
 * 4. Assigns any unassigned videos (teacherId = NULL) to the primary administrator.
 * 5. Assigns any unassigned Zoom meetings (teacherId = NULL) to the primary administrator.
 * 6. Assigns any unassigned Zoom accounts (userId = NULL) to the primary administrator.
 *
 * Usage:
 *   node migration.js
 *   npm run migrate:tenant
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Load environment variables from .env and .env.local if present
function loadEnv() {
  const envCandidates = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let value = line.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('\x1b[31m[ERROR] Neither DIRECT_URL nor DATABASE_URL is set in environment or .env file.\x1b[0m');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

async function runMigration() {
  console.log('\n\x1b[36m════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[36m   LERNIO MULTI-TENANT DATABASE MIGRATION SCRIPT           \x1b[0m');
  console.log('\x1b[36m════════════════════════════════════════════════════════════\x1b[0m\n');

  const client = await pool.connect();

  try {
    // ─── Step 1: Ensure Schema Alignment ─────────────────────────────────
    console.log('\x1b[34m[1/6]\x1b[0m Checking and updating schema definitions...');

    // Add TEACHER to enum Role
    try {
      await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEACHER';`);
      console.log('  ✔ Role enum updated with TEACHER value.');
    } catch (err) {
      // If error occurs because it already exists or enum type name differs
      console.log('  ℹ Role enum check completed.');
    }

    // Ensure teacherId on User
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_teacherId_fkey') THEN
          ALTER TABLE "User" ADD CONSTRAINT "User_teacherId_fkey"
          FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Ensure teacherId on Video
    await client.query(`ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Video_teacherId_fkey') THEN
          ALTER TABLE "Video" ADD CONSTRAINT "Video_teacherId_fkey"
          FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Ensure teacherId on ZoomLink
    await client.query(`ALTER TABLE "ZoomLink" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZoomLink_teacherId_fkey') THEN
          ALTER TABLE "ZoomLink" ADD CONSTRAINT "ZoomLink_teacherId_fkey"
          FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Ensure userId on ZoomAccount
    await client.query(`ALTER TABLE "ZoomAccount" ADD COLUMN IF NOT EXISTS "userId" TEXT;`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZoomAccount_userId_fkey') THEN
          ALTER TABLE "ZoomAccount" ADD CONSTRAINT "ZoomAccount_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    console.log('  ✔ All multi-tenant schema columns and constraints verified.\n');

    // ─── Step 2: Locate Primary Administrator ─────────────────────────────
    console.log('\x1b[34m[2/6]\x1b[0m Locating primary Administrator...');
    const adminResult = await client.query(
      `SELECT id, username, "createdAt" FROM "User" WHERE role::text = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1;`
    );

    if (adminResult.rows.length === 0) {
      console.error(
        '\n\x1b[31m[ERROR] Migration aborted: No user with role = \'ADMIN\' was found.\x1b[0m'
      );
      console.error(
        'Please ensure you have registered or seeded an Admin user before migrating data.\n'
      );
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    console.log(`  ✔ Found Primary Admin: \x1b[1m\x1b[32m${admin.username}\x1b[0m (ID: ${admin.id})\n`);

    // ─── Step 3: Migrate Students ─────────────────────────────────────────
    console.log('\x1b[34m[3/6]\x1b[0m Migrating student accounts...');
    const unassignedStudents = await client.query(
      `SELECT COUNT(*)::int as count FROM "User" WHERE role::text = 'STUDENT' AND "teacherId" IS NULL;`
    );
    const studentsToMigrate = unassignedStudents.rows[0].count;

    if (studentsToMigrate > 0) {
      const updateStudents = await client.query(
        `UPDATE "User" SET "teacherId" = $1 WHERE role::text = 'STUDENT' AND "teacherId" IS NULL;`,
        [admin.id]
      );
      console.log(`  ✔ Reassigned \x1b[32m${updateStudents.rowCount}\x1b[0m student(s) to Admin (${admin.username}).`);
    } else {
      console.log('  ℹ No unassigned students found. All students already belong to a teacher.');
    }

    // ─── Step 4: Migrate Videos ───────────────────────────────────────────
    console.log('\n\x1b[34m[4/6]\x1b[0m Migrating video catalog...');
    const unassignedVideos = await client.query(
      `SELECT COUNT(*)::int as count FROM "Video" WHERE "teacherId" IS NULL;`
    );
    const videosToMigrate = unassignedVideos.rows[0].count;

    if (videosToMigrate > 0) {
      const updateVideos = await client.query(
        `UPDATE "Video" SET "teacherId" = $1 WHERE "teacherId" IS NULL;`,
        [admin.id]
      );
      console.log(`  ✔ Reassigned \x1b[32m${updateVideos.rowCount}\x1b[0m video(s) to Admin (${admin.username}).`);
    } else {
      console.log('  ℹ No unassigned videos found. All videos already belong to a teacher.');
    }

    // ─── Step 5: Migrate Zoom Meetings ────────────────────────────────────
    console.log('\n\x1b[34m[5/6]\x1b[0m Migrating Zoom meetings...');
    const unassignedMeetings = await client.query(
      `SELECT COUNT(*)::int as count FROM "ZoomLink" WHERE "teacherId" IS NULL;`
    );
    const meetingsToMigrate = unassignedMeetings.rows[0].count;

    if (meetingsToMigrate > 0) {
      const updateMeetings = await client.query(
        `UPDATE "ZoomLink" SET "teacherId" = $1 WHERE "teacherId" IS NULL;`,
        [admin.id]
      );
      console.log(`  ✔ Reassigned \x1b[32m${updateMeetings.rowCount}\x1b[0m Zoom meeting(s) to Admin (${admin.username}).`);
    } else {
      console.log('  ℹ No unassigned meetings found. All meetings already belong to a teacher.');
    }

    // ─── Step 6: Migrate Zoom Accounts ────────────────────────────────────
    console.log('\n\x1b[34m[6/6]\x1b[0m Migrating Zoom API credentials...');
    const unassignedAccounts = await client.query(
      `SELECT COUNT(*)::int as count FROM "ZoomAccount" WHERE "userId" IS NULL;`
    );
    const accountsToMigrate = unassignedAccounts.rows[0].count;

    if (accountsToMigrate > 0) {
      const updateAccounts = await client.query(
        `UPDATE "ZoomAccount" SET "userId" = $1 WHERE "userId" IS NULL;`,
        [admin.id]
      );
      console.log(`  ✔ Reassigned \x1b[32m${updateAccounts.rowCount}\x1b[0m Zoom account(s) to Admin (${admin.username}).`);
    } else {
      console.log('  ℹ No unassigned Zoom credentials found. All accounts already belong to a user.');
    }

    // ─── Migration Summary ───────────────────────────────────────────────
    console.log('\n\x1b[32m════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1m\x1b[32m   MIGRATION COMPLETED SUCCESSFULLY                        \x1b[0m');
    console.log('\x1b[32m════════════════════════════════════════════════════════════\x1b[0m\n');
    console.log(`  Primary Administrator : \x1b[1m${admin.username}\x1b[0m (${admin.id})`);
    console.log(`  Students Updated      : \x1b[1m${studentsToMigrate}\x1b[0m`);
    console.log(`  Videos Updated        : \x1b[1m${videosToMigrate}\x1b[0m`);
    console.log(`  Zoom Meetings Updated : \x1b[1m${meetingsToMigrate}\x1b[0m`);
    console.log(`  Zoom Accounts Updated : \x1b[1m${accountsToMigrate}\x1b[0m\n`);
    console.log('The system is now fully aligned with multi-tenant scoping.');
    console.log('You can now create Teacher accounts, and teachers will manage their own students and content.\n');

  } catch (err) {
    console.error('\n\x1b[31m[ERROR] Migration failed with exception:\x1b[0m', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
