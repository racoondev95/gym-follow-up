const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authenticateToken, authorizeAdmin, authorizeUserOrAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserWithSessions
} = require('../controllers/userController');
const { getSessionsByUserId } = require('../controllers/sessionController');

// GET all users (admin only)
router.get('/', authenticateToken, authorizeAdmin, getAllUsers);

// POST create user (admin only, or use register endpoint)
router.post('/', authenticateToken, authorizeAdmin, upload.single('profilePicture'), createUser);

// GET user with sessions and exercises (user can see own, admin can see all) - must be before /:id
router.get('/:id/with-sessions', authenticateToken, authorizeUserOrAdmin, getUserWithSessions);

// GET sessions by user ID (user can see own, admin can see all) - must be before /:id
router.get('/:id/sessions', authenticateToken, authorizeUserOrAdmin, getSessionsByUserId);

// GET user by ID (user can see own profile, admin can see all)
router.get('/:id', authenticateToken, authorizeUserOrAdmin, getUserById);

// PUT update user (user can update own profile, admin can update all)
router.put('/:id', authenticateToken, authorizeUserOrAdmin, upload.single('profilePicture'), updateUser);

// DELETE user (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, deleteUser);

module.exports = router;

