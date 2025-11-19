const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname);
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'gym_followup',
  multipleStatements: true
};

async function runMigrations() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected successfully!');
    
    // Create migrations tracking table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `);
    
    // Get all SQL migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log(`Found ${files.length} migration file(s).\n`);
    
    // Get already executed migrations
    const [executedMigrations] = await connection.query(
      'SELECT filename FROM migrations'
    );
    const executedFilenames = new Set(executedMigrations.map(m => m.filename));
    
    // Run migrations
    for (const file of files) {
      if (executedFilenames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`🔄 Running migration: ${file}`);
      
      try {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        
        // Execute migration
        await connection.query(sql);
        
        // Record migration
        await connection.query(
          'INSERT INTO migrations (filename, description) VALUES (?, ?)',
          [file, `Migration: ${file}`]
        );
        
        console.log(`✅ Successfully executed: ${file}\n`);
      } catch (error) {
        console.error(`❌ Error executing ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('✨ All migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run migrations
runMigrations();

