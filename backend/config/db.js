const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Add AI columns to batteries if they don't exist
pool.query(`
  ALTER TABLE batteries ADD COLUMN IF NOT EXISTS ai_severity VARCHAR(20);
  ALTER TABLE batteries ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
`).catch(err => console.error('Migration warning:', err.message));

// Add cost column to swap_transactions if it doesn't exist
pool.query(`
  ALTER TABLE swap_transactions ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
`).catch(err => console.error('Migration warning:', err.message));

// OTP table for 2FA
pool.query(`
  CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false
  );
`).catch(err => console.error('Migration warning:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
