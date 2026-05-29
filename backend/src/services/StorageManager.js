const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * StorageManager handles file storage operations
 * Designed to be replaceable with cloud storage (AWS S3, Azure Blob, etc.)
 */
class StorageManager {
  constructor(storagePath = path.join(__dirname, '../../uploads')) {
    this.storagePath = storagePath;
    this.fileMetadata = new Map(); // In-memory metadata store
  }

  /**
   * Store processed image
   * @param {Buffer} imageBuffer - Image data
   * @param {Object} metadata - Metadata to store
   * @returns {Promise<string>} File ID (UUID)
   */
  async storeImage(imageBuffer, metadata = {}) {
    const fileId = uuidv4();
    const filename = `${fileId}.${metadata.format || 'png'}`;
    const filepath = path.join(this.storagePath, filename);

    try {
      await fs.writeFile(filepath, imageBuffer);
      
      // Store metadata
      this.fileMetadata.set(fileId, {
        id: fileId,
        filename,
        filepath,
        format: metadata.format || 'png',
        width: metadata.width,
        height: metadata.height,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        ...metadata
      });

      return fileId;
    } catch (error) {
      throw new Error(`Failed to store image: ${error.message}`);
    }
  }

  /**
   * Retrieve image file
   * @param {string} fileId - File UUID
   * @returns {Promise<Buffer>} Image buffer
   */
  async getImage(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    
    if (!metadata) {
      throw new Error(`Image not found: ${fileId}`);
    }

    // Check if file has expired
    if (new Date(metadata.expiresAt) < new Date()) {
      await this.deleteImage(fileId);
      throw new Error(`Image has expired: ${fileId}`);
    }

    try {
      const imageBuffer = await fs.readFile(metadata.filepath);
      return imageBuffer;
    } catch (error) {
      throw new Error(`Failed to retrieve image: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   * @param {string} fileId - File UUID
   * @returns {Object} Image metadata
   */
  getMetadata(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    
    if (!metadata) {
      throw new Error(`Image metadata not found: ${fileId}`);
    }

    return metadata;
  }

  /**
   * Delete image file
   * @param {string} fileId - File UUID
   * @returns {Promise<boolean>}
   */
  async deleteImage(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    
    if (!metadata) {
      return false;
    }

    try {
      await fs.unlink(metadata.filepath);
      this.fileMetadata.delete(fileId);
      return true;
    } catch (error) {
      console.error(`Failed to delete image ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired files
   * @returns {Promise<number>} Number of deleted files
   */
  async cleanupExpired() {
    let deletedCount = 0;
    const now = new Date();

    for (const [fileId, metadata] of this.fileMetadata.entries()) {
      if (new Date(metadata.expiresAt) < now) {
        const deleted = await this.deleteImage(fileId);
        if (deleted) deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get file size
   * @param {string} fileId - File UUID
   * @returns {Promise<number>} File size in bytes
   */
  async getFileSize(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    
    if (!metadata) {
      throw new Error(`Image not found: ${fileId}`);
    }

    try {
      const stats = await fs.stat(metadata.filepath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * List all stored images (admin function)
   * @returns {Array<Object>} List of image metadata
   */
  listImages() {
    return Array.from(this.fileMetadata.values());
  }
}

module.exports = new StorageManager();
