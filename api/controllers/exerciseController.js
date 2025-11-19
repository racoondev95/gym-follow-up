const Exercise = require('../models/Exercise');
const Session = require('../models/Session');

const getAllExercises = async (req, res) => {
  try {
    const userId = req.user.userRole === 'admin' ? null : req.user.userId;
    const exercises = await Exercise.findAll(userId);
    res.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExercisesBySessionId = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if user owns this session or is admin
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exercises = await Exercise.findBySessionId(sessionId);
    res.json(exercises);
  } catch (error) {
    console.error('Error fetching session exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const exercise = await Exercise.findById(id);
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const session = await Session.findById(exercise.sessionId);
    
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(exercise);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createExercise = async (req, res) => {
  try {
    const { sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = req.body;
    
    if (!sessionId || !name) {
      return res.status(400).json({ error: 'sessionId and name are required' });
    }
    
    // Check if user owns this session or is admin
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const newExercise = await Exercise.create({
      sessionId,
      name,
      numberOfSeries,
      rangeRepsPerSeries,
      weightOnLastSeries,
      repsOnLastSeries
    });
    
    res.status(201).json(newExercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = req.body;
    
    const currentExercise = await Exercise.findById(id);
    
    if (!currentExercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const session = await Session.findById(currentExercise.sessionId);
    
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (numberOfSeries !== undefined) updateData.numberOfSeries = numberOfSeries;
    if (rangeRepsPerSeries !== undefined) updateData.rangeRepsPerSeries = rangeRepsPerSeries;
    if (weightOnLastSeries !== undefined) updateData.weightOnLastSeries = weightOnLastSeries;
    if (repsOnLastSeries !== undefined) updateData.repsOnLastSeries = repsOnLastSeries;
    
    const updatedExercise = await Exercise.update(id, updateData);
    res.json(updatedExercise);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exercise = await Exercise.findById(id);
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Check if user owns the session this exercise belongs to or is admin
    const session = await Session.findById(exercise.sessionId);
    
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Exercise.delete(id);
    
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllExercises,
  getExercisesBySessionId,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
};

