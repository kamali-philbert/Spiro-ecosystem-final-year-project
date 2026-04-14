const db = require('./config/db');

async function checkOTP() {
  try {
    const result = await db.query('SELECT * FROM otp_codes ORDER BY id DESC LIMIT 5;');
    console.log(result.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

checkOTP();
