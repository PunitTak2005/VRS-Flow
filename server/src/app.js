const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const contactRoutes = require('./routes/contactRoutes');


const app = express();

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: false // Allow loading upload images in the frontend from port 5004
  })
);

// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3004',
    credentials: true
  })
);

// Dev logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set Static folders
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Map Routes
app.use('/api/auth', authRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);


// Base Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Volunteer System API is fully functional',
    time: new Date(),
    mockDatabase: process.env.USE_MOCK_DB === 'true'
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
