const express = require('express');
const multer = require('multer');
const ImageProcessor = require('../services/ImageProcessor');
const StorageManager = require('../services/StorageManager');
const ValidationMiddleware = require('../middleware/validation');

const router = express.Router();

// Configure multer for image uploads (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * POST /api/process/transform
 * Main endpoint to process an image with transformation operations
 * 
 * Request body (multipart/form-data):
 * - image: File (required) - Image file to process
 * - operations: JSON string (required) - Array of operations to apply
 * - outputFormat: string (optional, default: 'png') - Output format
 * 
 * Response:
 * {
 *   fileId: string,
 *   format: string,
 *   width: number,
 *   height: number,
 *   sizeBytes: number,
 *   downloadUrl: string,
 *   expiresAt: string
 * }
 */
router.post('/transform', upload.single('image'), async (req, res, next) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!req.body.operations) {
      return res.status(400).json({ error: 'Operations parameter is required' });
    }

    // Parse operations
    let operations;
    try {
      operations = typeof req.body.operations === 'string' 
        ? JSON.parse(req.body.operations)
        : req.body.operations;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid operations JSON' });
    }

    // Validate operations
    ImageProcessor.validateOperations(operations);

    // Validate image
    const imageMetadata = await ImageProcessor.validateImage(req.file.buffer);

    // Process image
    const outputFormat = req.body.outputFormat || 'png';
    const processedBuffer = await ImageProcessor.processImage(
      req.file.buffer,
      operations,
      outputFormat
    );

    // Store processed image
    const fileId = await StorageManager.storeImage(processedBuffer, {
      format: outputFormat,
      width: imageMetadata.width,
      height: imageMetadata.height,
      sourceFormat: imageMetadata.format,
      operations: operations
    });

    // Get file size
    const fileSize = await StorageManager.getFileSize(fileId);

    // Get metadata
    const storedMetadata = StorageManager.getMetadata(fileId);

    res.json({
      fileId,
      format: outputFormat,
      width: imageMetadata.width,
      height: imageMetadata.height,
      sizeBytes: fileSize,
      downloadUrl: `/api/image/download/${fileId}`,
      expiresAt: storedMetadata.expiresAt,
      metadata: {
        operationsApplied: operations.length,
        processingTime: 'N/A' // Can be enhanced with timing
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/process/batch
 * Process multiple images in sequence
 * 
 * Accepts array of {image, operations, outputFormat}
 */
router.post('/batch', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    if (!req.body.operations) {
      return res.status(400).json({ error: 'Operations parameter is required' });
    }

    // Parse operations
    let operations;
    try {
      operations = typeof req.body.operations === 'string'
        ? JSON.parse(req.body.operations)
        : req.body.operations;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid operations JSON' });
    }

    ImageProcessor.validateOperations(operations);

    const results = [];
    const outputFormat = req.body.outputFormat || 'png';

    // Process each image
    for (const file of req.files) {
      try {
        const imageMetadata = await ImageProcessor.validateImage(file.buffer);
        const processedBuffer = await ImageProcessor.processImage(
          file.buffer,
          operations,
          outputFormat
        );

        const fileId = await StorageManager.storeImage(processedBuffer, {
          format: outputFormat,
          width: imageMetadata.width,
          height: imageMetadata.height,
          sourceFormat: imageMetadata.format,
          operations: operations
        });

        const fileSize = await StorageManager.getFileSize(fileId);
        const storedMetadata = StorageManager.getMetadata(fileId);

        results.push({
          fileId,
          originalFilename: file.originalname,
          format: outputFormat,
          sizeBytes: fileSize,
          downloadUrl: `/api/image/download/${fileId}`,
          expiresAt: storedMetadata.expiresAt,
          status: 'success'
        });
      } catch (error) {
        results.push({
          originalFilename: file.originalname,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      totalImages: req.files.length,
      successCount: results.filter(r => r.status === 'success').length,
      results
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/process/info
 * Get information about supported operations and formats
 */
router.get('/info', (req, res) => {
  res.json({
    supportedOperations: [
      { type: 'fliph', description: 'Flip image horizontally (left-right)' },
      { type: 'flipv', description: 'Flip image vertically (top-bottom)' },
      { type: 'grayscale', description: 'Convert image to grayscale' },
      { type: 'rotateleft', description: 'Rotate image 90 degrees counter-clockwise' },
      { type: 'rotateright', description: 'Rotate image 90 degrees clockwise' },
      { type: 'rotate', description: 'Rotate image by custom angle', parameters: { angle: 'number' } }
    ],
    supportedFormats: ImageProcessor.getSupportedFormats(),
    maxFileSize: '50MB',
    maxBatchSize: 10,
    fileRetention: '24 hours'
  });
});

module.exports = router;
