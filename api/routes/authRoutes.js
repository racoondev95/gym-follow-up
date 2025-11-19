const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authenticateToken } = require('../middleware/auth');
const { register, login, getCurrentUser } = require('../controllers/authController');

// POST register (no authentication required)
router.post('/register', upload.single('profilePicture'), register);

// POST login (no authentication required)
router.post('/login', login);

// GET current user (authenticated)
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;

