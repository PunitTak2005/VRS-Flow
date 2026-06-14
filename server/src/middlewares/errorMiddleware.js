const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Multer limit error (e.g. file size limit exceeded)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { message: 'File is too large. Maximum size allowed is 10MB.', statusCode: 400 };
  }

  // Multer upload errors
  if (err.message && err.message.includes('Unsupported file type')) {
    error = { message: err.message, statusCode: 400 };
  }
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;
