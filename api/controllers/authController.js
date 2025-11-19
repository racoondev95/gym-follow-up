const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, userRole: user.userRole },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const register = async (req, res) => {
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
    
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      userRole: role,
      profilePicturePath
    });
    
    // Generate JWT token
    const token = generateToken(newUser);
    
    res.status(201).json({
      user: newUser,
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
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email or username
    const user = await User.findByEmailOrUsername(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token: token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};

