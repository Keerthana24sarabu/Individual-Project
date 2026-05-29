/**
 * Global error handler middleware
 * Catches and formats errors consistently
 */
module.exports = function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 50MB'
      });
    }
    return res.status(400).json({
      error: err.message
    });
  }

  // Custom validation errors
  if (err.message && err.message.startsWith('Only image')) {
    return res.status(400).json({
      error: err.message
    });
  }

  // Image processing errors
  if (err.message && (
    err.message.includes('Invalid image') ||
    err.message.includes('Unsupported operation') ||
    err.message.includes('Operations must')
  )) {
    return res.status(400).json({
      error: err.message
    });
  }

  // Storage errors
  if (err.message && err.message.includes('Failed to')) {
    return res.status(500).json({
      error: err.message,
      code: 'STORAGE_ERROR'
    });
  }

  // Generic error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};
