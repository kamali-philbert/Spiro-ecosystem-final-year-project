const { Pool } = require('pg');
const pool = new Pool({ user:'spiro_admin', password:'spiro123', database:'spiro_db', host:'localhost', port:5432 });
pool.query('SELECT * FROM users LIMIT 10')
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
