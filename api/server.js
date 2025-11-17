const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
let db;

const connectDB = async () => {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      database: process.env.DB_NAME || 'gym_followup',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
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
      // Add new columns if they don't exist
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

// ==================== JWT MIDDLEWARE ====================

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authorization middleware - Admin only
const authorizeAdmin = (req, res, next) => {
  if (req.user.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Authorization middleware - User can access their own data or admin
const authorizeUserOrAdmin = (req, res, next) => {
  const requestedUserId = parseInt(req.params.id || req.params.userId || req.body.userId);
  if (req.user.userRole !== 'admin' && req.user.userId !== requestedUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

// POST register (no authentication required)
app.post('/api/auth/register', upload.single('profilePicture'), async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, userRole } = req.body;
    
    if (!email || !username || !password || !firstName || !lastName) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate userRole if provided
    if (userRole && !['admin', 'user'].includes(userRole)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'userRole must be either "admin" or "user"' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const profilePicturePath = req.file ? `/uploads/profiles/${req.file.filename}` : null;
    const role = userRole || 'user';
    
    const [result] = await db.query(
      'INSERT INTO users (email, username, password, firstName, lastName, userRole, profilePicturePath) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, username, hashedPassword, firstName, lastName, role, profilePicturePath]
    );
    
    const [newUser] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [result.insertId]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser[0].id, email: newUser[0].email, userRole: newUser[0].userRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: newUser[0],
      token: token
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error registering user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST login (no authentication required)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email or username
    const [users] = await db.query(
      'SELECT id, email, username, password, firstName, lastName, userRole, profilePicturePath FROM users WHERE email = ? OR username = ?',
      [email, email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userRole: user.userRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    delete user.password;
    
    res.json({
      user: user,
      token: token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET current user (authenticated)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER ROUTES ====================

// GET all users (admin only)
app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET user by ID (user can see own profile, admin can see all)
app.get('/api/users/:id', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create user (admin only, or use register endpoint)
app.post('/api/users', authenticateToken, authorizeAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, userRole } = req.body;
    
    if (!email || !username || !password || !firstName || !lastName) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const profilePicturePath = req.file ? `/uploads/profiles/${req.file.filename}` : null;
    const role = userRole || 'user';
    
    const [result] = await db.query(
      'INSERT INTO users (email, username, password, firstName, lastName, userRole, profilePicturePath) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, username, hashedPassword, firstName, lastName, role, profilePicturePath]
    );
    
    const [newUser] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PUT update user (user can update own profile, admin can update all)
app.put('/api/users/:id', authenticateToken, authorizeUserOrAdmin, upload.single('profilePicture'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, password, firstName, lastName, userRole } = req.body;
    
    // Get current user to check if profile picture exists
    const [currentUser] = await db.query('SELECT profilePicturePath FROM users WHERE id = ?', [id]);
    
    if (currentUser.length === 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Only admin can change userRole
    if (userRole && req.user.userRole !== 'admin') {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: 'Only admin can change user role' });
    }
    
    let profilePicturePath = currentUser[0].profilePicturePath;
    
    // If new file uploaded, delete old one and update path
    if (req.file) {
      if (currentUser[0].profilePicturePath) {
        const oldFilePath = path.join(__dirname, currentUser[0].profilePicturePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    if (firstName) {
      updateFields.push('firstName = ?');
      updateValues.push(firstName);
    }
    if (lastName) {
      updateFields.push('lastName = ?');
      updateValues.push(lastName);
    }
    if (userRole && req.user.userRole === 'admin') {
      updateFields.push('userRole = ?');
      updateValues.push(userRole);
    }
    if (profilePicturePath !== undefined) {
      updateFields.push('profilePicturePath = ?');
      updateValues.push(profilePicturePath);
    }
    
    if (updateFields.length === 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    const [updatedUser] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    
    res.json(updatedUser[0]);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE user (admin only)
app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user to delete profile picture
    const [user] = await db.query('SELECT profilePicturePath FROM users WHERE id = ?', [id]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete profile picture if exists
    if (user[0].profilePicturePath) {
      const filePath = path.join(__dirname, user[0].profilePicturePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SESSION ROUTES ====================

// GET all sessions (authenticated users can see their own, admin can see all)
app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM exercises WHERE sessionId = s.id) as exerciseCount
      FROM sessions s
    `;
    let params = [];
    
    // If not admin, only show own sessions
    if (req.user.userRole !== 'admin') {
      query += ' WHERE s.userId = ?';
      params.push(req.user.userId);
    }
    
    query += ' ORDER BY s.sessionDate DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET sessions by user ID (user can see own, admin can see all)
app.get('/api/users/:userId/sessions', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM exercises WHERE sessionId = s.id) as exerciseCount
       FROM sessions s
       WHERE s.userId = ?
       ORDER BY s.sessionDate DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET session by ID (user can see own, admin can see all)
app.get('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && rows[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create session (authenticated users can create for themselves, admin can create for anyone)
app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    let { userId, name, sessionDate, exercises } = req.body;
    
    // If not admin, use own userId
    if (req.user.userRole !== 'admin') {
      userId = req.user.userId;
    }
    
    if (!userId || !sessionDate) {
      return res.status(400).json({ error: 'userId and sessionDate are required' });
    }
    
    // Convert ISO date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    let mysqlDateTime = sessionDate;
    if (sessionDate) {
      const date = new Date(sessionDate);
      if (!isNaN(date.getTime())) {
        // Format: YYYY-MM-DD HH:MM:SS
        mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create session
      const [result] = await db.query(
        'INSERT INTO sessions (userId, name, sessionDate) VALUES (?, ?, ?)',
        [userId, name || null, mysqlDateTime]
      );
      
      const sessionId = result.insertId;
      
      // Create exercises if provided
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        for (const exercise of exercises) {
          const { name: exerciseName, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = exercise;
          
          if (exerciseName) {
            await db.query(
              'INSERT INTO exercises (sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries) VALUES (?, ?, ?, ?, ?, ?)',
              [sessionId, exerciseName, numberOfSeries || null, rangeRepsPerSeries || null, weightOnLastSeries || null, repsOnLastSeries || null]
            );
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch the complete session with exercises
      const [newSession] = await db.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);
      const [sessionExercises] = await db.query('SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC', [sessionId]);
      
      res.status(201).json({
        ...newSession[0],
        exercises: sessionExercises
      });
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating session:', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PUT update session (user can update own, admin can update all)
app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sessionDate, exercises } = req.body;
    
    const [currentSession] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
    
    if (currentSession.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && currentSession[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name || null);
      }
      
      if (sessionDate) {
        // Convert ISO date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        let mysqlDateTime = sessionDate;
        const date = new Date(sessionDate);
        if (!isNaN(date.getTime())) {
          mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
        }
        updateFields.push('sessionDate = ?');
        updateValues.push(mysqlDateTime);
      }
      
      if (updateFields.length > 0) {
        updateValues.push(id);
        await db.query(
          `UPDATE sessions SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }
      
      // Handle exercises update if provided
      if (exercises !== undefined) {
        // Delete existing exercises
        await db.query('DELETE FROM exercises WHERE sessionId = ?', [id]);
        
        // Insert new exercises
        if (Array.isArray(exercises) && exercises.length > 0) {
          for (const exercise of exercises) {
            const { name: exerciseName, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = exercise;
            
            if (exerciseName) {
              await db.query(
                'INSERT INTO exercises (sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries) VALUES (?, ?, ?, ?, ?, ?)',
                [id, exerciseName, numberOfSeries || null, rangeRepsPerSeries || null, weightOnLastSeries || null, repsOnLastSeries || null]
              );
            }
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch the complete session with exercises
      const [updatedSession] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
      const [sessionExercises] = await db.query('SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC', [id]);
      
      res.json({
        ...updatedSession[0],
        exercises: sessionExercises
      });
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE session (user can delete own, admin can delete all)
app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [session] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
    
    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.query('DELETE FROM sessions WHERE id = ?', [id]);
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== EXERCISE ROUTES ====================

// GET all exercises (authenticated users can see exercises from their sessions, admin can see all)
app.get('/api/exercises', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT e.* FROM exercises e';
    let params = [];
    
    // If not admin, only show exercises from own sessions
    if (req.user.userRole !== 'admin') {
      query += ' INNER JOIN sessions s ON e.sessionId = s.id WHERE s.userId = ?';
      params.push(req.user.userId);
    }
    
    query += ' ORDER BY e.createdAt DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET exercises by session ID (user can see exercises from own sessions, admin can see all)
app.get('/api/sessions/:sessionId/exercises', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if user owns this session or is admin
    const [session] = await db.query('SELECT userId FROM sessions WHERE id = ?', [sessionId]);
    
    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [rows] = await db.query(
      'SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC',
      [sessionId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching session exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET exercise by ID (user can see exercises from own sessions, admin can see all)
app.get('/api/exercises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM exercises WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const [session] = await db.query('SELECT userId FROM sessions WHERE id = ?', [rows[0].sessionId]);
    
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create exercise (user can create for own sessions, admin can create for any)
app.post('/api/exercises', authenticateToken, async (req, res) => {
  try {
    const { sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = req.body;
    
    if (!sessionId || !name) {
      return res.status(400).json({ error: 'sessionId and name are required' });
    }
    
    // Check if user owns this session or is admin
    const [session] = await db.query('SELECT userId FROM sessions WHERE id = ?', [sessionId]);
    
    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [result] = await db.query(
      'INSERT INTO exercises (sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, name, numberOfSeries || null, rangeRepsPerSeries || null, weightOnLastSeries || null, repsOnLastSeries || null]
    );
    
    const [newExercise] = await db.query('SELECT * FROM exercises WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newExercise[0]);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update exercise (user can update exercises from own sessions, admin can update all)
app.put('/api/exercises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = req.body;
    
    const [currentExercise] = await db.query('SELECT * FROM exercises WHERE id = ?', [id]);
    
    if (currentExercise.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const [session] = await db.query('SELECT userId FROM sessions WHERE id = ?', [currentExercise[0].sessionId]);
    
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (numberOfSeries !== undefined) {
      updateFields.push('numberOfSeries = ?');
      updateValues.push(numberOfSeries);
    }
    if (rangeRepsPerSeries !== undefined) {
      updateFields.push('rangeRepsPerSeries = ?');
      updateValues.push(rangeRepsPerSeries);
    }
    if (weightOnLastSeries !== undefined) {
      updateFields.push('weightOnLastSeries = ?');
      updateValues.push(weightOnLastSeries);
    }
    if (repsOnLastSeries !== undefined) {
      updateFields.push('repsOnLastSeries = ?');
      updateValues.push(repsOnLastSeries);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.query(
      `UPDATE exercises SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    const [updatedExercise] = await db.query('SELECT * FROM exercises WHERE id = ?', [id]);
    
    res.json(updatedExercise[0]);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE exercise (user can delete exercises from own sessions, admin can delete all)
app.delete('/api/exercises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [exercise] = await db.query('SELECT * FROM exercises WHERE id = ?', [id]);
    
    if (exercise.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const [session] = await db.query('SELECT userId FROM sessions WHERE id = ?', [exercise[0].sessionId]);
    
    if (req.user.userRole !== 'admin' && session[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.query('DELETE FROM exercises WHERE id = ?', [id]);
    
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET session with exercises (user can see own, admin can see all)
app.get('/api/sessions/:id/with-exercises', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [sessions] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && sessions[0].userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [exercises] = await db.query(
      'SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC',
      [id]
    );
    
    res.json({
      ...sessions[0],
      exercises: exercises
    });
  } catch (error) {
    console.error('Error fetching session with exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET user with sessions and exercises (user can see own, admin can see all)
app.get('/api/users/:id/with-sessions', authenticateToken, authorizeUserOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const [sessions] = await db.query(
      'SELECT * FROM sessions WHERE userId = ? ORDER BY sessionDate DESC',
      [id]
    );
    
    // Get exercises for each session
    for (let session of sessions) {
      const [exercises] = await db.query(
        'SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC',
        [session.id]
      );
      session.exercises = exercises;
    }
    
    res.json({
      ...users[0],
      sessions: sessions
    });
  } catch (error) {
    console.error('Error fetching user with sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check (no authentication required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});
