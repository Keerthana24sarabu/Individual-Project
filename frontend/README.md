# Image Processor - Client Libraries & Demo

This directory contains client-side code and demo applications for the Image Processor API.

## Contents

- **ImageProcessorClient.js** - JavaScript/Node.js SDK for the API
- **examples.js** - Usage examples for the client library
- **../demo/index.html** - Interactive web UI demo

## ImageProcessorClient - JavaScript/Node.js SDK

The `ImageProcessorClient` is a developer-friendly wrapper around the Image Processor API.

### Installation

For Node.js projects:

```bash
npm install
```

Then copy `ImageProcessorClient.js` to your project:

```bash
cp ImageProcessorClient.js /path/to/your/project/
```

### Quick Start

```javascript
const ImageProcessorClient = require('./ImageProcessorClient');

// Initialize client
const client = new ImageProcessorClient('http://localhost:3000/api');

// Process an image
const result = await client.processImage('./input.jpg', [
  { type: 'fliph' },
  { type: 'grayscale' }
]);

console.log(result);
// Output:
// {
//   fileId: "550e8400-e29b-41d4-a716-446655440000",
//   format: "png",
//   width: 1920,
//   height: 1080,
//   sizeBytes: 2048576,
//   downloadUrl: "/api/image/download/550e8400-e29b-41d4-a716-446655440000"
// }

// Save result to file
await client.saveImage(result.fileId, './output.png');
```

## API Reference

### Constructor

```javascript
const client = new ImageProcessorClient(baseUrl, options);
```

**Parameters:**
- `baseUrl` (string) - API base URL (default: 'http://localhost:3000/api')
- `options` (object) - Configuration options
  - `timeout` (number) - Request timeout in ms (default: 30000)

### Methods

#### `getHealth()`

Check service health.

```javascript
const health = await client.getHealth();
// { status: 'healthy', timestamp: '...', uptime: 1234.56 }
```

#### `getInfo()`

Get service capabilities (supported operations, formats, limits).

```javascript
const info = await client.getInfo();
// {
//   supportedOperations: [...],
//   supportedFormats: ['png', 'jpeg', ...],
//   maxFileSize: '50MB',
//   fileRetention: '24 hours'
// }
```

#### `processImage(imagePath, operations, options)`

Transform a single image.

**Parameters:**
- `imagePath` (string|Buffer) - Path to image file or Buffer
- `operations` (array) - Array of operations to apply
- `options` (object) - Additional options
  - `outputFormat` (string) - Output format (default: 'png')

**Returns:** Promise resolving to result object

```javascript
const result = await client.processImage(
  './input.jpg',
  [
    { type: 'fliph' },
    { type: 'grayscale' },
    { type: 'rotateright' }
  ],
  { outputFormat: 'png' }
);

console.log(result);
// {
//   fileId: '550e8400-e29b-41d4-a716-446655440000',
//   format: 'png',
//   width: 1920,
//   height: 1080,
//   sizeBytes: 2048576,
//   downloadUrl: '/api/image/download/550e8400-e29b-41d4-a716-446655440000',
//   expiresAt: '2024-05-28T14:30:00Z'
// }
```

#### `processBatch(imagePaths, operations, options)`

Process multiple images with the same operations.

**Parameters:**
- `imagePaths` (array) - Array of image paths or Buffers (max 10)
- `operations` (array) - Array of operations
- `options` (object) - Additional options

**Returns:** Promise resolving to batch results

```javascript
const batchResult = await client.processBatch(
  ['./image1.jpg', './image2.jpg', './image3.jpg'],
  [{ type: 'grayscale' }],
  { outputFormat: 'png' }
);

console.log(batchResult);
// {
//   totalImages: 3,
//   successCount: 3,
//   results: [
//     { fileId: '...', status: 'success', ... },
//     { fileId: '...', status: 'success', ... },
//     { fileId: '...', status: 'success', ... }
//   ]
// }
```

#### `downloadImage(fileId)`

Download processed image as Buffer.

```javascript
const imageBuffer = await client.downloadImage('550e8400-e29b-41d4-a716-446655440000');
```

#### `saveImage(fileId, outputPath)`

Save processed image to file.

```javascript
await client.saveImage('550e8400-e29b-41d4-a716-446655440000', './output.png');
console.log('Image saved!');
```

#### `getImageInfo(fileId)`

Get metadata about processed image.

```javascript
const info = await client.getImageInfo('550e8400-e29b-41d4-a716-446655440000');
// {
//   fileId: '550e8400-e29b-41d4-a716-446655440000',
//   format: 'png',
//   width: 1920,
//   height: 1080,
//   sizeBytes: 2048576,
//   createdAt: '2024-05-27T14:15:00Z',
//   expiresAt: '2024-05-28T14:15:00Z'
// }
```

#### `deleteImage(fileId)`

Delete image from storage.

```javascript
const result = await client.deleteImage('550e8400-e29b-41d4-a716-446655440000');
// { success: true, message: 'Image deleted' }
```

## Supported Operations

| Operation | Type | Description |
|-----------|------|-------------|
| Flip Horizontal | `fliph` | Flip image left-right |
| Flip Vertical | `flipv` | Flip image top-bottom |
| Grayscale | `grayscale` | Convert to grayscale |
| Rotate Left | `rotateleft` | Rotate 90° counter-clockwise |
| Rotate Right | `rotateright` | Rotate 90° clockwise |

Operations are applied in the order specified.

## Supported Formats

- **Input:** JPEG, PNG, WebP, GIF, TIFF
- **Output:** PNG, JPEG, WebP, GIF, TIFF

## Examples

### Example 1: Simple Grayscale Conversion

```javascript
const ImageProcessorClient = require('./ImageProcessorClient');
const client = new ImageProcessorClient('http://localhost:3000/api');

async function convertToGrayscale() {
  try {
    const result = await client.processImage('./photo.jpg', [
      { type: 'grayscale' }
    ]);
    
    await client.saveImage(result.fileId, './photo-gray.jpg');
    console.log('✓ Converted to grayscale');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

convertToGrayscale();
```

### Example 2: Complex Pipeline

```javascript
const result = await client.processImage('./input.jpg', [
  { type: 'fliph' },           // Mirror left-right
  { type: 'grayscale' },       // Convert to grayscale
  { type: 'rotateright' },     // Rotate 90° clockwise
  { type: 'flipv' }            // Flip top-bottom
], { outputFormat: 'webp' });

await client.saveImage(result.fileId, './output.webp');
```

### Example 3: Batch Processing

```javascript
const files = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
const operations = [
  { type: 'grayscale' },
  { type: 'fliph' }
];

const batchResult = await client.processBatch(
  files,
  operations,
  { outputFormat: 'png' }
);

for (const result of batchResult.results) {
  if (result.status === 'success') {
    console.log(`✓ Processed: ${result.originalFilename}`);
    await client.saveImage(result.fileId, `output-${result.originalFilename}`);
  } else {
    console.error(`✗ Failed: ${result.originalFilename} - ${result.error}`);
  }
}
```

### Example 4: Error Handling

```javascript
try {
  const result = await client.processImage('./image.jpg', [
    { type: 'invalid_operation' }  // This will error
  ]);
} catch (error) {
  console.error('Error:', error.message);
  // Output: "Unsupported operation: invalid_operation"
}
```

### Example 5: Using Buffers

```javascript
const fs = require('fs').promises;

// Read image as buffer
const imageBuffer = await fs.readFile('./input.jpg');

// Process buffer directly
const result = await client.processImage(imageBuffer, [
  { type: 'grayscale' }
]);

// Save result
await client.saveImage(result.fileId, './output.jpg');
```

## Web UI Demo

The `../demo/index.html` file provides an interactive web-based demo:

1. **Upload Image** - Drag and drop or select image file
2. **Select Operations** - Choose transformations to apply
3. **Choose Format** - Select output format
4. **Process** - Click to process image
5. **Download** - Save the result

### Running the Demo

```bash
cd demo

# Option 1: Using Python
python3 -m http.server 8000

# Option 2: Using Node.js http-server
npx http-server

# Option 3: Using Live Server in VS Code
# Right-click index.html -> "Open with Live Server"

# Access: http://localhost:8000 (or appropriate port)
```

## Error Handling

The client provides meaningful error messages:

```javascript
try {
  await client.processImage('./nonexistent.jpg', [{ type: 'grayscale' }]);
} catch (error) {
  console.error(error.message);
  // Possible errors:
  // - "imagePath must be a file path string or Buffer"
  // - "Operations must be a non-empty array"
  // - "HTTP 400: Invalid image format"
  // - "HTTP 404: Image not found"
  // - "Failed to download image: Image has expired"
}
```

## Performance Tips

1. **Batch Processing** - Use `processBatch()` for multiple images to reduce overhead
2. **Output Format** - Use WebP for smaller file sizes
3. **Connection Pooling** - Reuse client instance across requests
4. **Timeout Configuration** - Increase timeout for large images

```javascript
const client = new ImageProcessorClient(
  'http://localhost:3000/api',
  { timeout: 60000 }  // 60 second timeout
);
```

## Integration Examples

### Express.js Integration

```javascript
const express = require('express');
const ImageProcessorClient = require('./ImageProcessorClient');
const client = new ImageProcessorClient('http://localhost:3000/api');

const app = express();

app.post('/api/enhance-image', async (req, res) => {
  try {
    const result = await client.processImage(req.file.buffer, [
      { type: 'grayscale' },
      { type: 'fliph' }
    ]);
    
    res.json({
      fileId: result.fileId,
      downloadUrl: `/api/download/${result.fileId}`
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/download/:fileId', async (req, res) => {
  try {
    const imageBuffer = await client.downloadImage(req.params.fileId);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.listen(3001);
```

### CLI Tool

```javascript
#!/usr/bin/env node

const ImageProcessorClient = require('./ImageProcessorClient');
const { program } = require('commander');
const path = require('path');

const client = new ImageProcessorClient('http://localhost:3000/api');

program
  .command('process <input> <output>')
  .option('-o, --operations <ops>', 'JSON array of operations')
  .option('-f, --format <format>', 'Output format', 'png')
  .action(async (input, output, options) => {
    try {
      const ops = JSON.parse(options.operations);
      const result = await client.processImage(input, ops, {
        outputFormat: options.format
      });
      
      await client.saveImage(result.fileId, output);
      console.log(`✓ Saved to ${output}`);
    } catch (error) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

## Troubleshooting

### Connection Issues

```javascript
// Check if service is healthy
try {
  const health = await client.getHealth();
  console.log('✓ Service is', health.status);
} catch (error) {
  console.error('✗ Cannot connect to service:', error.message);
}
```

### Operation Not Supported

```javascript
// Get supported operations
const info = await client.getInfo();
console.log(info.supportedOperations.map(op => op.type));
```

### File Not Found

```javascript
// Image expires after 24 hours
const info = await client.getImageInfo(fileId);
console.log('Expires at:', info.expiresAt);
```

## License

MIT

## Support

For issues or questions about the client library, check:
- API Specification: `../backend/API_SPECIFICATION.yaml`
- Architecture: `../documentation/ARCHITECTURE.md`
- Main README: `../README.md`
