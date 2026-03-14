import { accessSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[seed] DATABASE_URL is not set');
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), 'prisma/seed.sql');

try {
  accessSync(sqlPath);
} catch {
  console.error(`[seed] seed file not found: ${sqlPath}`);
  process.exit(1);
}

const result = spawnSync('psql', [databaseUrl, '-f', sqlPath], {
  stdio: 'inherit',
});

if (result.error) {
  console.error('[seed] failed to execute psql. Ensure PostgreSQL client is installed.');
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('[seed] default lists ensured: Работа, Личное, Без списка');
