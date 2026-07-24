# MerchantFlow — Otomasi GoPay Merchant

Aplikasi full-stack responsif untuk membuat invoice GoPay, menampilkan QR/deeplink pembayaran, menerima notifikasi Midtrans, dan meneruskan callback ke sistem merchant. Dana tidak ditampung aplikasi; transaksi dibuat menggunakan kredensial Midtrans milik merchant.

## Fitur

- Landing page dan dashboard responsif untuk HP/tablet/desktop
- Register/login dengan cookie HttpOnly
- Kredensial Midtrans sandbox/production terenkripsi AES-256-GCM
- Invoice GoPay melalui Midtrans Core API
- QR code dan deeplink GoPay
- Webhook Midtrans dengan verifikasi SHA-512 dan idempotensi
- Callback merchant bertanda tangan HMAC SHA-256
- API key yang hanya ditampilkan sekali
- REST API create payment, status, dan sinkronisasi
- Riwayat transaksi, filter status, statistik dashboard
- Health check MongoDB, Dockerfile, dan Render Blueprint

## Penting

Proyek ini menggunakan integrasi resmi Midtrans Core API. GoPay desktop dapat dilaporkan sebagai `qris`, sedangkan alur smartphone dapat dilaporkan sebagai `gopay`. Settlement mengikuti akun dan perjanjian merchant Midtrans; aplikasi ini tidak menyimpan saldo pelanggan atau merchant.

## Menjalankan lokal

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Konfigurasi Midtrans

1. Login atau daftar akun merchant.
2. Buka **Integrasi** di dashboard.
3. Isi Server Key dan Client Key Midtrans.
4. Pilih Sandbox untuk pengujian.
5. Webhook per transaksi otomatis diarahkan ke:
   `https://DOMAIN/api/webhooks/midtrans/MERCHANT_ID`

Pastikan `APP_URL` di Render berisi URL publik HTTPS aplikasi.

## REST API

Gunakan header:

```http
X-API-Key: mf_live_xxxxxxxxx
Content-Type: application/json
```

Create payment:

```http
POST /api/v1/payments
```

```json
{
  "order_id": "INV-1001",
  "amount": 50000,
  "description": "Pembelian paket VPS",
  "customer": {
    "name": "Budi",
    "email": "budi@example.com",
    "phone": "08123456789"
  },
  "callback_url": "https://merchant.example/webhook"
}
```

Status:

```http
GET /api/v1/payments/INV-1001
```

Sinkronisasi dengan Midtrans:

```http
POST /api/v1/payments/INV-1001/sync
```

## Deploy ke Render

1. Buat MongoDB Atlas dan database user.
2. Hubungkan repository ke Render sebagai Blueprint.
3. Isi `MONGODB_URI` dan `APP_URL`.
4. Deploy.
5. Tambahkan alamat outbound Render ke IP Access List Atlas, atau izinkan akses yang sesuai kebijakan keamanan Anda.

## Keamanan produksi

- Jangan commit `.env` atau credential Midtrans.
- Gunakan MongoDB user dengan hak minimum yang diperlukan.
- Gunakan domain HTTPS.
- Putar `JWT_SECRET` dan `MASTER_ENCRYPTION_KEY` secara terkontrol.
- Untuk skala multi-instance, pindahkan rate limit dan antrean callback ke Redis/worker.
- Lakukan review legal, KYC, branding, serta syarat Midtrans/GoPay sebelum digunakan publik.

## Lisensi

Proprietary starter project. Sesuaikan lisensi sebelum distribusi publik.
