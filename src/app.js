const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const env = require('./config/env');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const { attachUser } = require('./middleware/auth');
const { issueCsrf } = require('./middleware/csrf');
const format = require('./utils/format');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://api.midtrans.com', 'https://api.sandbox.midtrans.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(compression());
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: false, limit: '250kb' }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: env.nodeEnv === 'production' ? '7d' : 0 }));
  app.use(attachUser);
  app.use(issueCsrf);

  app.use((req, res, next) => {
    res.locals.brandName = env.brandName;
    res.locals.currentPath = req.path;
    res.locals.query = req.query;
    res.locals.format = format;
    res.locals.appUrl = env.appUrl;
    next();
  });

  app.get('/health', async (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    if (dbReady) {
      try { await mongoose.connection.db.admin().ping(); } catch { return res.status(503).json({ ok: false, database: 'unreachable' }); }
    }
    res.status(dbReady ? 200 : 503).json({ ok: dbReady, database: dbReady ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiRoutes);
  app.use(webRoutes);

  app.use((req, res) => res.status(404).render('errors/generic', { title: '404', message: 'Halaman yang Anda cari tidak ditemukan.' }));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    if (req.path.startsWith('/api/')) return res.status(500).json({ success: false, error: 'Terjadi kesalahan internal' });
    res.status(500).render('errors/generic', { title: 'Terjadi kesalahan', message: env.nodeEnv === 'production' ? 'Silakan coba kembali.' : error.message });
  });
  return app;
}

module.exports = { createApp };
