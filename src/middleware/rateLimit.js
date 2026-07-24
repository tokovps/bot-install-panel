const buckets = new Map();

function rateLimit({ windowMs = 60000, limit = 60 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > limit) {
      res.set('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ success: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}, 60000).unref();

module.exports = { rateLimit };
