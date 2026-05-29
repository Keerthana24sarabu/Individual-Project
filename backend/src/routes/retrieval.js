const express = require('express');
const StorageManager = require('../services/StorageManager');

const router = express.Router();

/**
 * GET /api/image/download/:fileId
 * Download processed image
 */
router.get('/download/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Validate file ID format (UUID)
    if (!fileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    // Get image
    const imageBuffer = await StorageManager.getImage(fileId);
    const metadata = StorageManager.getMetadata(fileId);

    // Set response headers
    res.setHeader('Content-Type', `image/${metadata.format}`);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="image-${fileId}.${metadata.format}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(imageBuffer);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('expired')) {
      res.status(404).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/image/info/:fileId
 * Get metadata about processed image
 */
router.get('/info/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Validate file ID format
    if (!fileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const metadata = StorageManager.getMetadata(fileId);
    const fileSize = await StorageManager.getFileSize(fileId);

    res.json({
      fileId,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      sizeBytes: fileSize,
      createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt,
      operationsApplied: metadata.operations
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/image/:fileId
 * Delete image from storage
 */
router.delete('/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Validate file ID format
    if (!fileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const deleted = await StorageManager.deleteImage(fileId);

    if (deleted) {
      res.json({ success: true, message: `Image ${fileId} deleted` });
    } else {
      res.status(404).json({ error: `Image not found: ${fileId}` });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
