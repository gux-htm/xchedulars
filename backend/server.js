
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const timetableRoutes = require('./routes/timetable');
const timingRoutes = require('./routes/timing');
const roomRoutes = require('./routes/rooms');
const studentRoutes = require('./routes/student');
const offeringRoutes = require('./routes/offerings');
const examRoutes = require('./routes/exam');
const requestRoutes = require('./routes/requestRoutes');
const aiRoutes = require('./routes/ai');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development flexibility
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/timing', timingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/course-requests', requestRoutes);
app.use('/api/ai', aiRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
