const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllExercises,
  getExercisesBySessionId,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
} = require('../controllers/exerciseController');

// GET all exercises (authenticated users can see exercises from their sessions, admin can see all)
router.get('/', authenticateToken, getAllExercises);

// GET exercises by session ID (user can see exercises from own sessions, admin can see all)
router.get('/sessions/:sessionId', authenticateToken, getExercisesBySessionId);

// GET exercise by ID (user can see exercises from own sessions, admin can see all)
router.get('/:id', authenticateToken, getExerciseById);

// POST create exercise (user can create for own sessions, admin can create for any)
router.post('/', authenticateToken, createExercise);

// PUT update exercise (user can update exercises from own sessions, admin can update all)
router.put('/:id', authenticateToken, updateExercise);

// DELETE exercise (user can delete exercises from own sessions, admin can delete all)
router.delete('/:id', authenticateToken, deleteExercise);

module.exports = router;

