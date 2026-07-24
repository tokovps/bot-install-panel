const { randomToken, safeEqualHex } = require('../utils/crypto');
const env = require('../config/env');

function issueCsrf(req, res, next) {
  let token = req.cookies?.mf_csrf;
  if (!token) {
    token = randomToken(24);
    res.cookie('mf_csrf', token, {
      httpOnly: false,
      secure: env.cookieSecure,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
  }
  res.locals.csrfToken = token;
  next();
}

function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies?.mf_csrf || '';
  const requestToken = req.body?._csrf || req.get('x-csrf-token') || '';
  if (!cookieToken || !requestToken || !safeEqualHex(cookieToken, requestToken)) {
    return res.status(403).render('errors/generic', {
      title: 'Permintaan ditolak',
      message: 'Token keamanan tidak valid. Muat ulang halaman lalu coba kembali.'
    });
  }
  next();
}

module.exports = { issueCsrf, verifyCsrf };
