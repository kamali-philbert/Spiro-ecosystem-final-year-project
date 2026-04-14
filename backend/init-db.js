const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function initializeDatabase() {
  console.log('Attempting to connect to PostgreSQL...');
  try {
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, 'models', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the SQL
    console.log('Connection successful. Running schema.sql...');
    await db.query(schemaSql);
    
    console.log('✅ Database tables created successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === '28P01') {
      console.error('❌ Error: Password authentication failed. Please check the DB_PASSWORD in your .env file.');
    } else if (error.code === '3D000') {
      console.error('❌ Error: Database "spiro_db" does not exist. Please create it in pgAdmin first.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Error: Could not connect to PostgreSQL. Is the PostgreSQL service running on port 5432?');
    } else {
      console.error('❌ Unexpected Error:', error.message);
    }
    process.exit(1);
  }
}

initializeDatabase();
