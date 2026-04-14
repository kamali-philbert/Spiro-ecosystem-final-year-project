const db = require('./config/db');

async function migratePayments() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id  BIGSERIAL PRIMARY KEY,
        collector_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL, -- usually cashier or admin
        rider_id    BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
        amount      DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'CASH',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅  payments table created for cash auditing');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migratePayments();
