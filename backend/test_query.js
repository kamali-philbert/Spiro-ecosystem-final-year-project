const db = require('./config/db');

async function testQuery() {
  try {
    const res = await db.query('SELECT * FROM swap_transactions ORDER BY swap_timestamp DESC LIMIT 5');
    console.log("ALL SWAPS:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Initial Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testQuery();
