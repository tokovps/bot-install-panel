const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const env = require('../config/env');
const User = require('../models/User');
const Merchant = require('../models/Merchant');
const { randomToken } = require('../utils/crypto');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(150),
  password: z.string().min(8).max(100)
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: '7d' });
  res.cookie('mf_session', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function showLogin(req, res) {
  if (req.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Masuk', error: null, next: req.query.next || '/dashboard' });
}

function showRegister(req, res) {
  if (!env.allowRegistration) return res.status(403).render('errors/generic', { title: 'Pendaftaran ditutup', message: 'Pendaftaran akun baru sedang dinonaktifkan.' });
  if (req.user) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Daftar', error: null });
}

async function register(req, res) {
  try {
    if (!env.allowRegistration) throw new Error('Pendaftaran akun baru sedang dinonaktifkan');
    const data = registerSchema.parse(req.body);
    if (await User.exists({ email: data.email.toLowerCase() })) throw new Error('Email sudah terdaftar');
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 12)
    });
    await Merchant.create({ userId: user._id, webhookSecret: randomToken(32), businessName: data.name });
    setSession(res, user);
    res.redirect('/dashboard/integration?welcome=1');
  } catch (error) {
    const message = error.issues?.[0]?.message || error.message || 'Pendaftaran gagal';
    res.status(400).render('auth/register', { title: 'Daftar', error: message });
  }
}

async function login(req, res) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new Error('Email atau kata sandi salah');
    if (!user.isActive) throw new Error('Akun dinonaktifkan');
    user.lastLoginAt = new Date();
    await user.save();
    setSession(res, user);
    const next = String(req.body.next || '/dashboard');
    res.redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  } catch (error) {
    res.status(400).render('auth/login', { title: 'Masuk', error: error.message, next: req.body.next || '/dashboard' });
  }
}

function logout(req, res) {
  res.clearCookie('mf_session', { path: '/' });
  res.redirect('/');
}

module.exports = { showLogin, showRegister, register, login, logout };
