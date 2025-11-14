const { Pool } = require('pg');

let pool;

function parseSslMode(sslmode = 'disable') {
  const mode = sslmode.toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'prefer') {
    return false;
  }
  return {
    rejectUnauthorized: false,
  };
}

function getPool() {
  if (pool) {
    return pool;
  }

  const host = process.env.POSTGRES_HOST || 'postgresql-postgresql.data-services.svc.cluster.local';
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
  try {
    const client = await getPool().connect();
    client.release();
  } catch (error) {
    console.error('[postgres] Connection failed:', error.message);
    throw error;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    console.log(`[postgres] executed query in ${duration} ms`, { rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[postgres] Query error:', error.message);
    throw error;
  }
}

async function initSchema() {
  try {
    // Create users table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on username for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    // Create index on email for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    console.log('[postgres] Schema initialized successfully');
  } catch (error) {
    console.error('[postgres] Schema initialization failed:', error.message);
    throw error;
  }
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
  initSchema,
  closePool,
};

