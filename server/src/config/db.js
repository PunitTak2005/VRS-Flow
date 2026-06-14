const mongoose = require('mongoose');

const connectDB = async () => {
  if (process.env.USE_MOCK_DB === 'true') {
    console.log('--------------------------------------------------');
    console.log('⚠️ Running in DATABASE MOCK MODE (USE_MOCK_DB=true)');
    console.log('All data will be stored in-memory and seeded with sample data.');
    console.log('No local or Atlas MongoDB connection will be made.');
    console.log('--------------------------------------------------');
    return null;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/volunteer-system');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.log('--------------------------------------------------');
    console.log('⚠️ Failed to connect to MongoDB. Falling back to MOCK MODE.');
    console.log('To suppress this warning, set USE_MOCK_DB=true in your .env file.');
    console.log('--------------------------------------------------');
    process.env.USE_MOCK_DB = 'true';
    return null;
  }
};

module.exports = connectDB;
