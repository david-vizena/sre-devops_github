const { Pool } = require('pg');

let pool;

function parseSslMode(sslmode = 'disable') {
  const mode = sslmode.toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'prefer') {
    return false;
  }
  // For require/verify-ca/verify-full we disable certificate verification unless provided
  return {
    rejectUnauthorized: false,
  };
}

function getPool() {
  if (pool) {
    return pool;
  }

  const host = process.env.POSTGRES_HOST || 'postgresql-postgresql';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.POSTGRES_DB || 'portfolio';
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const sslmode = process.env.POSTGRES_SSLMODE || 'disable';
  const max = parseInt(process.env.POSTGRES_MAX_CONNS || '10', 10);

  if (!user || !password) {
    throw new Error('PostgreSQL credentials are required (POSTGRES_USER / POSTGRES_PASSWORD)');
  }

  pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max,
    ssl: parseSslMode(sslmode),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (err) => {
    console.error('[postgres] Unexpected error on idle client', err);
  });

  return pool;
}

async function ensureConnection() {
  const client = await getPool().connect();
  client.release();
}

async function query(text, params) {
  const start = Date.now();
  const result = await getPool().query(text, params);
  const duration = Date.now() - start;
  console.log(`[postgres] executed query in ${duration} ms`, { rows: result.rowCount });
  return result;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  ensureConnection,
  query,
  closePool,
};

