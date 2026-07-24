const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET', 'MASTER_ENCRYPTION_KEY', 'APP_URL'];

function loadEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter((name) => !process.env[name]);
    if (missing.length) {
      throw new Error(`Environment variable wajib belum diisi: ${missing.join(', ')}`);
    }
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    appUrl: (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/merchantflow',
    jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me-now',
    encryptionKey: process.env.MASTER_ENCRYPTION_KEY || 'development-encryption-key-change-me',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    brandName: process.env.BRAND_NAME || 'MerchantFlow',
    allowRegistration: process.env.ALLOW_REGISTRATION !== 'false'
  };
}

module.exports = loadEnv();
