const test = require('node:test');
const assert = require('node:assert/strict');
const { mapStatus, actionUrl } = require('../src/services/midtrans');

test('status Midtrans dipetakan ke status internal', () => {
  assert.equal(mapStatus('settlement'), 'paid');
  assert.equal(mapStatus('capture'), 'paid');
  assert.equal(mapStatus('expire'), 'expired');
  assert.equal(mapStatus('deny'), 'failed');
  assert.equal(mapStatus('refund'), 'refunded');
  assert.equal(mapStatus('pending'), 'pending');
});

test('action URL memilih nama prioritas', () => {
  const actions = [
    { name: 'generate-qr-code', url: 'old' },
    { name: 'generate-qr-code-v2', url: 'new' }
  ];
  assert.equal(actionUrl(actions, ['generate-qr-code-v2', 'generate-qr-code']), 'new');
});
