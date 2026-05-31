/**
 * Image Processor Client Library
 * Developer-friendly SDK for consuming the Image Processor API
 * 
 * Usage:
 * const ImageProcessorClient = require('./ImageProcessorClient');
 * const client = new ImageProcessorClient('http://localhost:3000/api');
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch'); // For Node.js < 18
// For Node.js 18+, use global fetch

class ImageProcessorClient {
  /**
   * Initialize the client
   * @param {string} baseUrl - API base URL (e.g., http://localhost:3000/api)
   * @param {Object} options - Configuration options
   */
  constructor(baseUrl = 'http://localhost:3000/api', options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = options.timeout || 30000;
  }

  /**
   * Check service health
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    const response = await this._request('GET', '/status/health');
    return response;
  }

  /**
   * Get service information (supported operations and formats)
   * @returns {Promise<Object>} Service capabilities
   */
  async getInfo() {
    const response = await this._request('GET', '/process/info');
    return response;
  }

  /**
   * Transform an image with specified operations
   * @param {string|Buffer} imagePath - Path to image file or Buffer
   * @param {Array<Object>} operations - Operations to apply
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result with fileId and download URL
   */
  async processImage(imagePath, operations, options = {}) {
    // Validate operations
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('Operations must be a non-empty array');
    }

    // Read image file
    let imageBuffer;
    if (typeof imagePath === 'string') {
      imageBuffer = await fs.readFile(imagePath);
    } else if (Buffer.isBuffer(imagePath)) {
      imageBuffer = imagePath;
    } else {
      throw new Error('imagePath must be a file path string or Buffer');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'image.bin');
    formData.append('operations', JSON.stringify(operations));
    formData.append('outputFormat', options.outputFormat || 'png');

    const response = await this._request('POST', '/process/transform', {
      body: formData,
      isFormData: true
    });

    return response;
  }

  /**
   * Process multiple images with the same operations
   * @param {string[]|Buffer[]} imagePaths - Paths or buffers of images
   * @param {Array<Object>} operations - Operations to apply to all images
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(imagePaths, operations, options = {}) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      throw new Error('imagePaths must be a non-empty array');
    }

    if (imagePaths.length > 10) {
      throw new Error('Maximum 10 images per batch');
    }

    // Create FormData
    const formData = new FormData();

    // Add images
    for (const imagePath of imagePaths) {
      let imageBuffer;
      if (typeof imagePath === 'string') {
        imageBuffer = await fs.readFile(imagePath);
      } else if (Buffer.isBuffer(imagePath)) {
        imageBuffer = imagePath;
      } else {
        throw new Error('Each imagePath must be a file path string or Buffer');
      }
      formData.append('images', new Blob([imageBuffer]), path.basename(imagePath));
    }

    formData.append('operations', JSON.stringify(operations));
    formData.append('outputFormat', options.outputFormat || 'png');

    const response = await this._request('POST', '/process/batch', {
      body: formData,
      isFormData: true
    });

    return response;
  }

  /**
   * Download processed image
   * @param {string} fileId - File ID from processing result
   * @returns {Promise<Buffer>} Image buffer
   */
  async downloadImage(fileId) {
    const response = await fetch(`${this.baseUrl}/image/download/${fileId}`, {
      timeout: this.timeout
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download image');
    }

    const buffer = await response.buffer();
    return buffer;
  }

  /**
   * Save processed image to file
   * @param {string} fileId - File ID from processing result
   * @param {string} outputPath - Path to save the image
   * @returns {Promise<void>}
   */
  async saveImage(fileId, outputPath) {
    const imageBuffer = await this.downloadImage(fileId);
    await fs.writeFile(outputPath, imageBuffer);
  }

  /**
   * Get image metadata
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Image metadata
   */
  async getImageInfo(fileId) {
    const response = await this._request('GET', `/image/info/${fileId}`);
    return response;
  }

  /**
   * Delete image from storage
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(fileId) {
    const response = await this._request('DELETE', `/image/${fileId}`);
    return response;
  }

  /**
   * Internal method to make HTTP requests
   * @private
   */
  async _request(method, path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const init = {
      method,
      timeout: this.timeout,
      ...options
    };

    // Handle headers
    if (!options.isFormData && !options.body) {
      init.headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return response;
  }
}

module.exports = ImageProcessorClient;
