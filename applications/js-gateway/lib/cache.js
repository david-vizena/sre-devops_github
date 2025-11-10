const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'redis-redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_PASSWORD ? `:${encodeURIComponent(REDIS_PASSWORD)}@` : ''}${REDIS_HOST}:${REDIS_PORT}`;
const DEFAULT_TTL_SECONDS = parseInt(process.env.REDIS_CACHE_TTL || '60', 10);

let client;

function createRedisClient() {
  const redisClient = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    },
  });

  redisClient.on('ready', () => console.log('[redis] connection ready'));
  redisClient.on('error', (err) => console.error('[redis] client error', err));
  redisClient.on('reconnecting', () => console.warn('[redis] reconnecting...'));

  return redisClient;
}

async function ensureConnected() {
  if (!client) {
    client = createRedisClient();
  }

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

async function get(key) {
  const redis = await ensureConnected();
  const result = await redis.get(key);
  return result ? JSON.parse(result) : null;
}

async function set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const redis = await ensureConnected();
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

async function wrap(key, fetchFn, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const cached = await get(key);
  if (cached) {
    return { data: cached, cacheHit: true };
  }

  const data = await fetchFn();
  await set(key, data, ttlSeconds);
  return { data, cacheHit: false };
}

async function del(key) {
  const redis = await ensureConnected();
  await redis.del(key);
}

async function close() {
  if (client && client.isOpen) {
    await client.quit();
  }
}

module.exports = {
  get,
  set,
  wrap,
  del,
  close,
  ensureConnected,
};

