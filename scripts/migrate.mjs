/**
 * Database migration runner — applies all pending migrations from supabase/migrations/.
 * Executed automatically during `pnpm build` (before Next.js build).
 *
 * Workflow:
 *   - Add new migrations: pnpm migration:new <name>   (requires Supabase CLI)
 *   - Run manually:       pnpm migrate
 *   - Runs automatically on every deploy via: pnpm build
 *
 * Tracks applied migrations in a `_migrations` table to avoid re-running.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env.local for local development (Vercel injects env vars directly)
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set — skipping migration');
  process.exit(0);
}

const { default: postgres } = await import('postgres');

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require',
  connect_timeout: 15,
});

try {
  // Create migrations tracking table if it doesn't exist
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await sql`SELECT name FROM _migrations`;
  const appliedSet = new Set(applied.map((r) => r.name));

  // Find all migration files, sorted by filename (timestamp order)
  const migrationsDir = resolve(root, 'supabase', 'migrations');
  if (!existsSync(migrationsDir)) {
    console.log('No migrations directory found — skipping');
    process.exit(0);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log('✅ Database is up to date — no pending migrations');
    process.exit(0);
  }

  console.log(`🔄 Applying ${pending.length} migration(s)...`);

  for (const file of pending) {
    const filePath = resolve(migrationsDir, file);
    const migrationSql = readFileSync(filePath, 'utf-8');

    console.log(`  ↳ ${file}`);
    await sql.unsafe(migrationSql);
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
  }

  console.log('✅ All migrations applied successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
