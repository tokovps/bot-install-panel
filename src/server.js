require('dotenv').config();
const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const { createApp } = require('./app');

async function start() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`${env.brandName} berjalan pada port ${env.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} diterima, menutup server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Gagal memulai aplikasi:', error);
  process.exit(1);
});
