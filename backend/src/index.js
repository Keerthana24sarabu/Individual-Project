require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const processingRoutes = require('./routes/processing');
const statusRoutes = require('./routes/status');
const StorageManager = require('./services/StorageManager');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ limit: process.env.MAX_FILE_SIZE || '50mb', extended: true }));

// Ensure upload directory exists
const uploadDir = path.resolve(process.env.STORAGE_PATH || path.join(__dirname, '../uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Periodic cleanup for expired files
StorageManager.cleanupExpired().catch((err) => {
  console.error('Initial cleanup failed:', err);
});
setInterval(() => {
  StorageManager.cleanupExpired().catch((err) => {
    console.error('Scheduled cleanup failed:', err);
  });
}, 60 * 60 * 1000); // every hour

// Routes
app.use('/api/process', processingRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/image', require('./routes/retrieval'));

// Root API info
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Image Processor API is running.',
    health: '/health',
    transform: '/api/process/transform',
    info: '/api/process/info'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Image Processor API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
