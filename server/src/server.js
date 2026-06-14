const dotenv = require('dotenv');
// Load environment variables first
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { runSMTPDiagnostics } = require('./services/emailService');

const PORT = process.env.PORT || 5004;

// Connect to Database
connectDB().then(async () => {
  // If we are in mock mode, seed the database automatically so it is ready to test immediately!
  if (process.env.USE_MOCK_DB === 'true') {
    const { seedMockData } = require('./utils/seed');
    await seedMockData();
  }

  // Seed default admin account
  const { seedDefaultAdmin } = require('./utils/seedAdmin');
  await seedDefaultAdmin();

  // Start Listener
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🔗 API Healthcheck: http://localhost:${PORT}/api/health`);
    // Verify SMTP connectivity so any misconfiguration is visible immediately
    runSMTPDiagnostics();
  });
});

// Handle unhandled promise rejections and uncaught exceptions gracefully
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Rejection:', err.stack || err.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.stack || err.message || err);
});
