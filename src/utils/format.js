function rupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value));
}

function statusLabel(status) {
  return ({
    pending: 'Menunggu',
    paid: 'Berhasil',
    expired: 'Kedaluwarsa',
    failed: 'Gagal',
    refunded: 'Dikembalikan'
  })[status] || status;
}

module.exports = { rupiah, dateTime, statusLabel };
