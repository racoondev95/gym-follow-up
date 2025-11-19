const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeUserOrAdmin } = require('../middleware/auth');
const {
  getAllSessions,
  getSessionsByUserId,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getSessionWithExercises
} = require('../controllers/sessionController');
const { getExercisesBySessionId } = require('../controllers/exerciseController');

// GET all sessions (authenticated users can see their own, admin can see all)
router.get('/', authenticateToken, getAllSessions);

// POST create session (authenticated users can create for themselves, admin can create for anyone)
router.post('/', authenticateToken, createSession);

// GET session with exercises (user can see own, admin can see all) - must be before /:id
router.get('/:id/with-exercises', authenticateToken, getSessionWithExercises);

// GET exercises by session ID (user can see exercises from own sessions, admin can see all) - must be before /:id
router.get('/:id/exercises', authenticateToken, getExercisesBySessionId);

// GET session by ID (user can see own, admin can see all)
router.get('/:id', authenticateToken, getSessionById);

// PUT update session (user can update own, admin can update all)
router.put('/:id', authenticateToken, updateSession);

// DELETE session (user can delete own, admin can delete all)
router.delete('/:id', authenticateToken, deleteSession);

module.exports = router;

