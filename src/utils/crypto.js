const crypto = require('crypto');

function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptText(plainText, masterSecret) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(masterSecret), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptText(payload, masterSecret) {
  if (!payload) return null;
  const [ivB64, tagB64, encryptedB64] = String(payload).split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error('Format data terenkripsi tidak valid');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(masterSecret),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hmacSha256(value, secret) {
  return crypto.createHmac('sha256', String(secret)).update(String(value)).digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const first = Buffer.from(String(a), 'hex');
    const second = Buffer.from(String(b), 'hex');
    return first.length === second.length && crypto.timingSafeEqual(first, second);
  } catch {
    return false;
  }
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  encryptText,
  decryptText,
  sha256,
  hmacSha256,
  safeEqualHex,
  randomToken
};
