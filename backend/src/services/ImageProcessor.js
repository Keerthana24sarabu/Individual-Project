const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * ImageProcessor service handles all image transformation operations
 * Supports: flip, grayscale, rotate operations
 * Uses Sharp library for performant image processing
 */
class ImageProcessor {
  /**
   * Validate image buffer and format
   * @param {Buffer} imageBuffer - Image data
   * @returns {Promise<Object>} Metadata about the image
   */
  static async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        valid: true,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha,
        colorspace: metadata.space
      };
    } catch (error) {
      throw new Error(`Invalid image format: ${error.message}`);
    }
  }

  /**
   * Process image with specified transformations
   * @param {Buffer} imageBuffer - Source image data
   * @param {Array<Object>} operations - Array of operations to apply in order
   * @param {string} outputFormat - Output image format (png, jpeg, webp, etc.)
   * @returns {Promise<Buffer>} Processed image buffer
   */
  static async processImage(imageBuffer, operations, outputFormat = 'png') {
    // Normalize EXIF orientation so transformations behave consistently
    let pipeline = sharp(imageBuffer).rotate();

    // Apply each operation in sequence
    for (const operation of operations) {
      pipeline = this.applyOperation(pipeline, operation);
    }

    // Convert to specified format and ensure orientation metadata is normalized
    const formatOptions = this.getFormatOptions(outputFormat);
    pipeline = pipeline.toFormat(outputFormat, formatOptions).withMetadata({ orientation: 1 });

    return await pipeline.toBuffer();
  }

  /**
   * Apply a single operation to the pipeline
   * @private
   */
  static applyOperation(pipeline, operation) {
    switch (operation.type.toLowerCase()) {
      case 'fliph':
      case 'flip_horizontal':
        return pipeline.flop(); // Flip horizontally (left-right)

      case 'flipv':
      case 'flip_vertical':
        return pipeline.flip(); // Flip vertically (top-bottom)

      case 'grayscale':
      case 'gray':
        return pipeline.grayscale();

      case 'rotateleft':
      case 'rotate_left':
      case 'rotccw':
        return pipeline.rotate(270); // Rotate 270 degrees (left)

      case 'rotateright':
      case 'rotate_right':
      case 'rotcw':
        return pipeline.rotate(90); // Rotate 90 degrees (right)

      case 'rotate':
        // Handle custom rotation angle if provided
        const angle = operation.angle || 0;
        return pipeline.rotate(angle);

      default:
        throw new Error(`Unknown operation: ${operation.type}`);
    }
  }

  /**
   * Get format-specific Sharp options
   * @private
   */
  static getFormatOptions(format) {
    const format_lower = format.toLowerCase();
    
    switch (format_lower) {
      case 'jpeg':
      case 'jpg':
        return { quality: 80, progressive: true };
      case 'webp':
        return { quality: 80 };
      case 'png':
        return { compressionLevel: 9 };
      default:
        return {};
    }
  }

  /**
   * Get supported output formats
   */
  static getSupportedFormats() {
    return ['png', 'jpeg', 'jpg', 'webp', 'gif', 'tiff'];
  }

  /**
   * Validate operation parameters
   */
  static validateOperations(operations) {
    if (!Array.isArray(operations)) {
      throw new Error('Operations must be an array');
    }

    if (operations.length === 0) {
      throw new Error('At least one operation must be specified');
    }

    const supportedOps = [
      'fliph', 'flip_horizontal',
      'flipv', 'flip_vertical',
      'grayscale', 'gray',
      'rotateleft', 'rotate_left', 'rotccw',
      'rotateright', 'rotate_right', 'rotcw',
      'rotate'
    ];

    for (const op of operations) {
      if (!op.type) {
        throw new Error('Each operation must have a type field');
      }
      if (!supportedOps.includes(op.type.toLowerCase())) {
        throw new Error(`Unsupported operation: ${op.type}`);
      }
    }

    return true;
  }
}

module.exports = ImageProcessor;
