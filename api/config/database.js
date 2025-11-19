const mysql = require('mysql2/promise');
require('dotenv').config();

let db;

const connectDB = async () => {
  try {
    // Use createPool instead of createConnection for better connection management
    db = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      database: process.env.DB_NAME || 'gym_followup',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    
    // Test the connection
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('Connected to MySQL database');
    
    // Initialize database tables
    await initializeDatabase();
  } catch (error) {
    console.error('Database connection error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

const initializeDatabase = async () => {
  try {
    // Create database if it doesn't exist
    await db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'gym_followup'}`);
    await db.query(`USE ${process.env.DB_NAME || 'gym_followup'}`);
    
    // Create users table with userRole
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        userRole ENUM('admin', 'user') DEFAULT 'user',
        profilePicturePath VARCHAR(500),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Add userRole column if it doesn't exist (for existing databases)
    try {
      await db.query('ALTER TABLE users ADD COLUMN userRole ENUM("admin", "user") DEFAULT "user"');
    } catch (error) {
      // Column already exists, ignore
    }
    
    // Create sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        name VARCHAR(255),
        sessionDate DATETIME NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_sessionDate (sessionDate)
      )
    `);
    
    // Add name column if it doesn't exist (for existing databases)
    try {
      await db.query('ALTER TABLE sessions ADD COLUMN name VARCHAR(255)');
    } catch (error) {
      // Column already exists, ignore
    }
    
    // Create exercises table
    await db.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessionId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        numberOfSeries INT,
        rangeRepsPerSeries VARCHAR(100),
        weightOnLastSeries DECIMAL(10,2),
        repsOnLastSeries INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        INDEX idx_sessionId (sessionId)
      )
    `);
    
    // Migrate existing columns to new structure
    try {
      await db.query('ALTER TABLE exercises ADD COLUMN numberOfSeries INT');
    } catch (error) {
      // Column already exists, ignore
    }
    try {
      await db.query('ALTER TABLE exercises ADD COLUMN rangeRepsPerSeries VARCHAR(100)');
    } catch (error) {
      // Column already exists, ignore
    }
    try {
      await db.query('ALTER TABLE exercises ADD COLUMN weightOnLastSeries DECIMAL(10,2)');
    } catch (error) {
      // Column already exists, ignore
    }
    try {
      await db.query('ALTER TABLE exercises ADD COLUMN repsOnLastSeries INT');
    } catch (error) {
      // Column already exists, ignore
    }
    
    // Migrate data from old columns to new (if old columns exist)
    try {
      await db.query(`
        UPDATE exercises 
        SET numberOfSeries = numberOfSets,
            rangeRepsPerSeries = rangeOfReps,
            repsOnLastSeries = repCountOnLast
        WHERE numberOfSeries IS NULL AND numberOfSets IS NOT NULL
      `);
    } catch (error) {
      // Old columns might not exist, ignore
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
};

module.exports = {
  connectDB,
  getDB
};

