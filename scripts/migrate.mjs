/**
 * Database migration script — runs supabase-schema.sql against the Postgres database.
 * Executed automatically during `pnpm build` (before Next.js build).
 * Safe to run multiple times — all SQL statements are idempotent.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
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
  console.log('🔄 Running database migrations...');
  const schema = readFileSync(resolve(root, 'supabase-schema.sql'), 'utf-8');
  await sql.unsafe(schema);
  console.log('✅ Migrations completed successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
