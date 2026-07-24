const test = require('node:test');
const assert = require('node:assert/strict');
const { encryptText, decryptText, sha256, hmacSha256, safeEqualHex } = require('../src/utils/crypto');

test('encrypt dan decrypt mempertahankan nilai', () => {
  const secret = 'master-secret-test';
  const encrypted = encryptText('SB-Mid-server-example', secret);
  assert.notEqual(encrypted, 'SB-Mid-server-example');
  assert.equal(decryptText(encrypted, secret), 'SB-Mid-server-example');
});

test('hash helper konsisten dan safe equal bekerja', () => {
  assert.equal(sha256('abc'), sha256('abc'));
  const a = hmacSha256('payload', 'secret');
  const b = hmacSha256('payload', 'secret');
  assert.equal(safeEqualHex(a, b), true);
  assert.equal(safeEqualHex(a, hmacSha256('other', 'secret')), false);
});
