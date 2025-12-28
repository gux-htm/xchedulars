const mysql = require('mysql2/promise');
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else {
  require('dotenv').config({ path: '.env.development' });
  // Fallback to .env if needed, but .env.development is safer for now
  if (!process.env.DB_HOST) {
    require('dotenv').config(); // Try default .env
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.NODE_ENV === 'test' ? 'root' : (process.env.DB_USER || 'root'),
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'university_timetable',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  socketPath: undefined
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
