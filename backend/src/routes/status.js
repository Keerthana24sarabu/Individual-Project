const express = require('express');

const router = express.Router();

/**
 * GET /api/status/health
 * Service health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/status/ready
 * Readiness probe for load balancers
 */
router.get('/ready', (req, res) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
