require('dotenv').config();

// Import mysql2
const mysql = require('mysql2');

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "******" : "NOT SET"); // Mask password
console.log("DB_NAME:", process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME
}).promise();

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS db;");
    console.log("✅ Successfully connected to:", rows[0].db);
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}

testConnection();
