const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Merchant = require('../models/Merchant');

async function attachUser(req, res, next) {
  const token = req.cookies?.mf_session;
  res.locals.user = null;
  res.locals.merchant = null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) return next();
    const merchant = await Merchant.findOne({ userId: user._id }).lean();
    req.user = user;
    req.merchant = merchant;
    res.locals.user = user;
    res.locals.merchant = merchant;
  } catch {
    res.clearCookie('mf_session');
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  next();
}

module.exports = { attachUser, requireAuth };
