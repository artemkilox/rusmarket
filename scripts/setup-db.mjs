import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Укажите DATABASE_URL в .env.local.');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8');
    await client.query(sql);
  }
  await client.query('COMMIT');
  console.log('Схема и демонстрационные данные готовы.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
