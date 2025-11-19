const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getProgressData } = require('../controllers/progressController');

// GET progress data (authenticated users can see their own, admin can see any user's data with ?userId=)
router.get('/', authenticateToken, getProgressData);

module.exports = router;

