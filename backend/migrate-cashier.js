const db = require('./config/db');

async function migrate() {
  try {
    // Safely add CASHIER to the user_role enum (no data is lost)
    await db.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CASHIER';`);
    console.log('✅  Migration successful: CASHIER added to user_role enum');

    // Add the otp_codes table in case it is missing (used by authController)
    await db.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id          BIGSERIAL PRIMARY KEY,
        user_id     BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
        code        VARCHAR(10) NOT NULL,
        expires_at  TIMESTAMP NOT NULL,
        used        BOOLEAN DEFAULT false
      );
    `);
    console.log('✅  otp_codes table ensured');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
