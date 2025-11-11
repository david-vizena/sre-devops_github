const amqp = require('amqplib');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq-rabbitmq.data-services.svc.cluster.local';
const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || '5672', 10);
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'guest';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';
const RABBITMQ_VHOST = process.env.RABBITMQ_VHOST || '/';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'analytics';
const RABBITMQ_QUEUE = process.env.RABBITMQ_QUEUE || 'analytics.events';
const RABBITMQ_ROUTING_KEY = process.env.RABBITMQ_ROUTING_KEY || 'analytics.events';
const RABBITMQ_HEARTBEAT = parseInt(process.env.RABBITMQ_HEARTBEAT || '30', 10);

let connection;
let channel;

function amqpUrl() {
  const credentials = `${encodeURIComponent(RABBITMQ_USERNAME)}:${encodeURIComponent(RABBITMQ_PASSWORD)}`;
  const vhost = RABBITMQ_VHOST.startsWith('/') ? RABBITMQ_VHOST : `/${RABBITMQ_VHOST}`;
  return `amqp://${credentials}@${RABBITMQ_HOST}:${RABBITMQ_PORT}${vhost}`;
}

async function ensureChannel() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(amqpUrl(), { heartbeat: RABBITMQ_HEARTBEAT });
  connection.on('error', (err) => console.error('[rabbitmq] connection error', err));
  connection.on('close', () => console.warn('[rabbitmq] connection closed'));

  channel = await connection.createConfirmChannel();
  channel.on('error', (err) => console.error('[rabbitmq] channel error', err));
  channel.on('close', () => console.warn('[rabbitmq] channel closed'));

  await channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });
  await channel.bindQueue(RABBITMQ_QUEUE, RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEY);

  console.log(`[rabbitmq] connected. exchange=${RABBITMQ_EXCHANGE} queue=${RABBITMQ_QUEUE}`);
  return channel;
}

async function publish(eventType, payload) {
  const ch = await ensureChannel();
  const message = {
    eventType,
    payload,
    publishedAt: new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(message));

  return new Promise((resolve, reject) => {
    ch.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
      buffer,
      {
        appId: 'js-gateway',
        contentType: 'application/json',
        deliveryMode: 2, // persistent
        headers: {
          'x-event-type': eventType,
        },
      },
      (err) => {
        if (err) {
          console.error('[rabbitmq] publish failed', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function close() {
  if (channel) {
    await channel.close().catch(() => {});
    channel = null;
  }

  if (connection) {
    await connection.close().catch(() => {});
    connection = null;
  }
}

module.exports = {
  publish,
  ensureChannel,
  close,
  RABBITMQ_QUEUE,
};

