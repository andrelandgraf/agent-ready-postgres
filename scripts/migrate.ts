import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: url });
await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
await pool.end();
console.log('Applied db/schema.sql');
