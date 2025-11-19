const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

module.exports = {
  authenticateToken,
  authorizeAdmin,
  authorizeUserOrAdmin
};

