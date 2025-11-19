const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Session = require('../models/Session');
const Exercise = require('../models/Exercise');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createUser = async (req, res) => {
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
    
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      userRole: role,
      profilePicturePath
    });
    
    res.status(201).json(newUser);
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
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, password, firstName, lastName, userRole } = req.body;
    
    // Get current user to check if profile picture exists
    const currentUser = await User.findById(id);
    
    if (!currentUser) {
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
    
    let profilePicturePath = currentUser.profilePicturePath;
    
    // If new file uploaded, delete old one and update path
    if (req.file) {
      if (currentUser.profilePicturePath) {
        const oldFilePath = path.join(__dirname, '..', currentUser.profilePicturePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    }
    
    const updateData = {};
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (userRole && req.user.userRole === 'admin') {
      updateData.userRole = userRole;
    }
    if (profilePicturePath !== undefined) {
      updateData.profilePicturePath = profilePicturePath;
    }
    
    const updatedUser = await User.update(id, updateData);
    res.json(updatedUser);
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
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.delete(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete profile picture if exists
    if (user.profilePicturePath) {
      const filePath = path.join(__dirname, '..', user.profilePicturePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserWithSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sessions = await Session.findByUserId(id);
    
    // Get exercises for each session
    for (let session of sessions) {
      const exercises = await Exercise.findBySessionId(session.id);
      session.exercises = exercises;
    }
    
    res.json({
      ...user,
      sessions: sessions
    });
  } catch (error) {
    console.error('Error fetching user with sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserWithSessions
};

