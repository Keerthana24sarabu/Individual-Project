# Image Processor API - Backend

A cloud-based image processing service that supports multiple transformation operations through a RESTful API.

## Features

- **Multiple Image Operations**: Flip (horizontal/vertical), grayscale conversion, and rotation (left/right)
- **Format Support**: PNG, JPEG, WebP, GIF, TIFF
- **Batch Processing**: Process multiple images with the same operations
- **Efficient Storage**: Automatic cleanup of expired files (24-hour retention)
- **RESTful API**: Easy-to-use endpoints with comprehensive documentation
- **Error Handling**: Robust error handling and validation
- **Scalable Design**: Ready for cloud deployment (AWS, Azure, GCP)

## Quick Start

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```
PORT=3000
NODE_ENV=development
```

### Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

Complete API documentation is available in `API_SPECIFICATION.yaml` (OpenAPI 3.0 format).

### Key Endpoints

- `POST /api/process/transform` - Transform a single image
- `POST /api/process/batch` - Process multiple images
- `GET /api/process/info` - Get supported operations and formats
- `GET /api/image/download/{fileId}` - Download processed image
- `GET /api/image/info/{fileId}` - Get image metadata
- `DELETE /api/image/{fileId}` - Delete image
- `GET /api/status/health` - Health check

## Usage Examples

### Transform Single Image

```bash
curl -X POST http://localhost:3000/api/process/transform \
  -F "image=@input.jpg" \
  -F 'operations=[{"type":"fliph"},{"type":"grayscale"},{"type":"rotateright"}]' \
  -F "outputFormat=png"
```

Response:
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "format": "png",
  "width": 1920,
  "height": 1080,
  "sizeBytes": 2048576,
  "downloadUrl": "/api/image/download/550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2024-05-28T14:30:00Z"
}
```

### Download Processed Image

```bash
curl http://localhost:3000/api/image/download/550e8400-e29b-41d4-a716-446655440000 \
  -o result.png
```

## Architecture

### Components

1. **Express Server** - Main HTTP server
2. **ImageProcessor Service** - Core image transformation logic (uses Sharp library)
3. **StorageManager Service** - File storage and metadata management
4. **Routes** - RESTful endpoint definitions
5. **Middleware** - Error handling and validation

### Technology Stack

- **Framework**: Express.js
- **Image Processing**: Sharp (libvips binding)
- **File Storage**: File system (replaceable with cloud storage)
- **Runtime**: Node.js 14+

## Design Patterns

- **Service Pattern**: Separation of concerns with dedicated services for image processing and storage
- **Middleware Pattern**: Request/response processing through middleware stack
- **Factory Pattern**: Image format handling
- **Strategy Pattern**: Different operations as pluggable strategies

## Deployment

### Docker

Build:
```bash
docker build -t image-processor-api .
```

Run:
```bash
docker run -p 3000:3000 -v ./uploads:/app/uploads image-processor-api
```

### Cloud Platforms

- **AWS**: Use with ECS, Lambda, or EC2
- **Azure**: Container Instances or App Service
- **GCP**: Cloud Run or App Engine

### Storage

For production, replace local file storage with cloud storage:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Any S3-compatible service (MinIO, etc.)

## Security Considerations

- File size limits (50MB default)
- MIME type validation
- UUID-based file identification
- Automatic file expiration (24 hours)
- CORS configuration
- Input validation for all operations

## Performance

- Streaming-based image processing
- In-memory operations for transformations
- Efficient library (Sharp uses libvips)
- Async/await for non-blocking operations
- Typical processing time: < 1 second per image

## Testing

Run tests:
```bash
npm test
```

## Development

### Project Structure

```
backend/
├── src/
│   ├── index.js              # Main Express app
│   ├── services/
│   │   ├── ImageProcessor.js # Image transformation logic
│   │   └── StorageManager.js # File storage management
│   ├── routes/
│   │   ├── processing.js     # Processing endpoints
│   │   ├── retrieval.js      # Image download endpoints
│   │   └── status.js         # Health check endpoints
│   └── middleware/
│       ├── errorHandler.js   # Error handling
│       └── validation.js     # Input validation
├── uploads/                   # Processed images storage
├── API_SPECIFICATION.yaml     # OpenAPI specification
├── package.json
└── .env.example
```

## Future Enhancements

- WebSocket support for real-time processing progress
- Advanced filters (blur, sharpen, etc.)
- Image compression optimization
- Usage analytics and metrics
- Rate limiting and authentication
- Database for metadata persistence
- Redis caching for common operations
- Async job queue for large batches

## License

MIT

## Support

For issues or questions, please create an issue in the project repository.
