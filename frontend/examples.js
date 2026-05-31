/**
 * Example usage of the Image Processor Client
 */

const ImageProcessorClient = require('./ImageProcessorClient');
const path = require('path');

async function main() {
  // Initialize client
  const client = new ImageProcessorClient('http://localhost:3000/api');

  console.log('=== Image Processor Client Examples ===\n');

  try {
    // Example 1: Check service health
    console.log('1. Checking service health...');
    const health = await client.getHealth();
    console.log('✓ Service is', health.status);
    console.log();

    // Example 2: Get service information
    console.log('2. Getting service information...');
    const info = await client.getInfo();
    console.log('✓ Supported operations:', info.supportedOperations.map(op => op.type).join(', '));
    console.log('✓ Supported formats:', info.supportedFormats.join(', '));
    console.log();

    // Example 3: Process a single image
    console.log('3. Processing single image...');
    const imagePath = './sample.jpg'; // Replace with actual image path
    
    const operations = [
      { type: 'fliph' },           // Flip horizontally
      { type: 'grayscale' }        // Convert to grayscale
    ];

    try {
      const result = await client.processImage(imagePath, operations, {
        outputFormat: 'png'
      });

      console.log('✓ Image processed successfully');
      console.log('  File ID:', result.fileId);
      console.log('  Format:', result.format);
      console.log('  Dimensions:', result.width, '×', result.height);
      console.log('  Size:', result.sizeBytes, 'bytes');
      console.log('  Download URL:', result.downloadUrl);
      console.log();

      // Example 4: Get image metadata
      console.log('4. Getting image metadata...');
      const metadata = await client.getImageInfo(result.fileId);
      console.log('✓ Image metadata:');
      console.log('  Created:', metadata.createdAt);
      console.log('  Expires:', metadata.expiresAt);
      console.log('  Operations applied:', metadata.operationsApplied.length);
      console.log();

      // Example 5: Save image to file
      console.log('5. Saving image to file...');
      const outputPath = './output.png';
      await client.saveImage(result.fileId, outputPath);
      console.log('✓ Image saved to', outputPath);
      console.log();

      // Example 6: Delete image
      console.log('6. Deleting image from storage...');
      const deleted = await client.deleteImage(result.fileId);
      console.log('✓ Image deleted:', deleted.success);
      console.log();

    } catch (err) {
      console.log('Note: Example 3 requires a sample image file.');
      console.log('Error:', err.message);
      console.log();
    }

    // Example 7: Batch processing (if you have multiple images)
    console.log('7. Batch processing example (code only):');
    console.log(`
    const imagePaths = ['./image1.jpg', './image2.jpg', './image3.jpg'];
    const operations = [
      { type: 'grayscale' },
      { type: 'rotateright' }
    ];

    const batchResult = await client.processBatch(imagePaths, operations);
    console.log('Batch results:', batchResult);
    `);
    console.log();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run examples
main().catch(console.error);
