const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * StorageManager handles file storage operations
 * Designed to be replaceable with cloud storage (AWS S3, Azure Blob, etc.)
 */
class StorageManager {
  constructor(storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../../uploads')) {
    this.storagePath = path.resolve(storagePath);
    this.metadataPath = path.join(this.storagePath, 'metadata.json');
    this.fileMetadata = new Map();
    this.fileRetentionHours = parseInt(process.env.FILE_RETENTION_HOURS, 10) || 24;

    this._initialize().catch((error) => {
      console.error('StorageManager initialization failed:', error);
    });
  }

  async _initialize() {
    await fs.mkdir(this.storagePath, { recursive: true });
    await this._loadMetadata();
    await this.cleanupExpired();
  }

  async _loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8');
      const records = JSON.parse(data);
      if (Array.isArray(records)) {
        for (const metadata of records) {
          this.fileMetadata.set(metadata.id, metadata);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load metadata file:', error);
      }
    }
  }

  async _persistMetadata() {
    const records = Array.from(this.fileMetadata.values());
    await fs.writeFile(this.metadataPath, JSON.stringify(records, null, 2), 'utf8');
  }

  async storeImage(imageBuffer, metadata = {}) {
    const fileId = uuidv4();
    const filename = `${fileId}.${metadata.format || 'png'}`;
    const filepath = path.join(this.storagePath, filename);

    try {
      await fs.writeFile(filepath, imageBuffer);
      const now = new Date();
      const expiresAt = metadata.expiresAt || new Date(now.getTime() + this.fileRetentionHours * 60 * 60 * 1000).toISOString();

      this.fileMetadata.set(fileId, {
        id: fileId,
        filename,
        filepath,
        format: metadata.format || 'png',
        width: metadata.width,
        height: metadata.height,
        createdAt: now.toISOString(),
        expiresAt,
        operations: metadata.operations || [],
        sourceFormat: metadata.sourceFormat || null
      });

      await this._persistMetadata();
      return fileId;
    } catch (error) {
      throw new Error(`Failed to store image: ${error.message}`);
    }
  }

  async getImage(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    if (!metadata) {
      throw new Error(`Image not found: ${fileId}`);
    }

    if (new Date(metadata.expiresAt) < new Date()) {
      await this.deleteImage(fileId);
      throw new Error(`Image has expired: ${fileId}`);
    }

    try {
      return await fs.readFile(metadata.filepath);
    } catch (error) {
      throw new Error(`Failed to retrieve image: ${error.message}`);
    }
  }

  getMetadata(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    if (!metadata) {
      throw new Error(`Image metadata not found: ${fileId}`);
    }

    if (new Date(metadata.expiresAt) < new Date()) {
      throw new Error(`Image has expired: ${fileId}`);
    }

    return metadata;
  }

  async deleteImage(fileId) {
    const metadata = this.fileMetadata.get(fileId);
    if (!metadata) {
      return false;
    }

    try {
      await fs.unlink(metadata.filepath).catch((error) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
      this.fileMetadata.delete(fileId);
      await this._persistMetadata();
      return true;
    } catch (error) {
      console.error(`Failed to delete image ${fileId}:`, error);
      return false;
    }
  }

  async cleanupExpired() {
    const now = new Date();
    const expiredIds = [];

    for (const [fileId, metadata] of this.fileMetadata.entries()) {
      if (new Date(metadata.expiresAt) < now) {
        expiredIds.push(fileId);
      }
    }

    for (const fileId of expiredIds) {
      await this.deleteImage(fileId);
    }

    return expiredIds.length;
  }

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

  listImages() {
    return Array.from(this.fileMetadata.values());
  }
}

module.exports = new StorageManager();
