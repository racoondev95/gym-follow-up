const express = require('express');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { corsMiddleware, corsOptions } = require('./config/cors');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);

// Health check (no authentication required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});
