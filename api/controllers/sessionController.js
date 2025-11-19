const Session = require('../models/Session');
const Exercise = require('../models/Exercise');
const { getDB } = require('../config/database');

const getAllSessions = async (req, res) => {
  try {
    const userId = req.user.userRole === 'admin' ? null : req.user.userId;
    const sessions = await Session.findAll(userId);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSessionsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.findByUserId(userId);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createSession = async (req, res) => {
  try {
    let { userId, name, sessionDate, exercises } = req.body;
    
    // If not admin, use own userId
    if (req.user.userRole !== 'admin') {
      userId = req.user.userId;
    }
    
    if (!userId || !sessionDate) {
      return res.status(400).json({ error: 'userId and sessionDate are required' });
    }
    
    const db = getDB();
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create session
      const newSession = await Session.create({ userId, name, sessionDate });
      
      // Create exercises if provided
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        for (const exercise of exercises) {
          const { name: exerciseName, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = exercise;
          
          if (exerciseName) {
            await Exercise.create({
              sessionId: newSession.id,
              name: exerciseName,
              numberOfSeries,
              rangeRepsPerSeries,
              weightOnLastSeries,
              repsOnLastSeries
            });
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch the complete session with exercises
      const sessionExercises = await Exercise.findBySessionId(newSession.id);
      
      res.status(201).json({
        ...newSession,
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
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sessionDate, exercises } = req.body;
    
    const currentSession = await Session.findById(id);
    
    if (!currentSession) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && currentSession.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = getDB();
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (sessionDate) updateData.sessionDate = sessionDate;
      
      if (Object.keys(updateData).length > 0) {
        await Session.update(id, updateData);
      }
      
      // Handle exercises update if provided
      if (exercises !== undefined) {
        // Delete existing exercises
        await Exercise.deleteBySessionId(id);
        
        // Insert new exercises
        if (Array.isArray(exercises) && exercises.length > 0) {
          for (const exercise of exercises) {
            const { name: exerciseName, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = exercise;
            
            if (exerciseName) {
              await Exercise.create({
                sessionId: id,
                name: exerciseName,
                numberOfSeries,
                rangeRepsPerSeries,
                weightOnLastSeries,
                repsOnLastSeries
              });
            }
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Fetch the complete session with exercises
      const updatedSession = await Session.findById(id);
      const sessionExercises = await Exercise.findBySessionId(id);
      
      res.json({
        ...updatedSession,
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
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Session.delete(id);
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSessionWithExercises = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if user owns this session or is admin
    if (req.user.userRole !== 'admin' && session.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const exercises = await Exercise.findBySessionId(id);
    
    res.json({
      ...session,
      exercises: exercises
    });
  } catch (error) {
    console.error('Error fetching session with exercises:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllSessions,
  getSessionsByUserId,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getSessionWithExercises
};

