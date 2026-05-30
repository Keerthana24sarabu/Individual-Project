# Image Processor - Architecture Document

## Executive Summary

The Image Processor is a cloud-based, RESTful web service designed to perform image transformations efficiently and reliably. This document describes the complete architectural design, API specifications, implementation details, and deployment strategy for the system.

**Key Characteristics:**
- **Type:** Distributed microservice
- **Architecture Pattern:** Layered/MVC with clear separation of concerns
- **Protocol:** REST over HTTP/HTTPS
- **Image Processing:** Efficient streaming-based processing using libvips (via Sharp.js)
- **Scalability:** Horizontally scalable, stateless API servers
- **Storage:** File-based with cloud storage abstraction
- **Target Deployment:** Cloud platforms (AWS, Azure, GCP)

---

## 1. High-Level System Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │  Web Browser     │  │  Mobile App      │  │  CLI/Desktop    ││
│  │  (HTML5/JS)      │  │                  │  │  Applications   ││
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘│
│           │                     │                      │          │
└───────────┼─────────────────────┼──────────────────────┼──────────┘
            │                     │                      │
            │ HTTP/HTTPS REST API │                      │
            │                     │                      │
┌───────────┼─────────────────────┼──────────────────────┼──────────┐
│           ▼                     ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │            API GATEWAY / LOAD BALANCER                      ││
│  │  (AWS ALB / Azure LB / NGINX Ingress)                       ││
│  └──────────────────────────────────────────────────────────────┘│
│           │                                                      │
│  ┌────────┴────────┬────────────────┬───────────────────┐        │
│  │                 │                │                   │        │
│  ▼                 ▼                ▼                   ▼        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │API Server│  │API Server│  │API Server│  │API Server│        │
│  │Instance 1│  │Instance 2│  │Instance 3│  │Instance N│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                     │                                            │
│           ┌─────────┴──────────┐                               │
│           │                    │                               │
│  ┌────────▼──────────┐  ┌──────▼─────────────┐               │
│  │  Processing      │  │  Storage           │               │
│  │  Logic Layer     │  │  Management Layer  │               │
│  │                  │  │                    │               │
│  │ - ImageProcessor │  │ - StorageManager   │               │
│  │ - Operations     │  │ - File Lifecycle   │               │
│  │ - Validation     │  │ - Metadata Store   │               │
│  └────────┬─────────┘  └──────┬─────────────┘               │
│           │                   │                              │
│  ┌────────▼───────────────────▼─────────────┐              │
│  │  Local File System / Cloud Storage       │              │
│  │  (S3 / Blob Storage / GCS)               │              │
│  │                                          │              │
│  │  Processed Images (TTL: 24 hours)        │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│ API SERVERS TIER (Horizontally Scalable)                  │
└─────────────────────────────────────────────────────────────┘
```

### Request/Response Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. POST /api/process/transform
       │    (multipart/form-data: image + operations)
       │
       ▼
┌─────────────────────────────────────┐
│ API Server (Express.js)             │
├─────────────────────────────────────┤
│ 2. Route Handler                    │
│    └─> Multer (file upload)         │
│    └─> Validation Middleware        │
│                                     │
│ 3. Processing Controller            │
│    └─> ImageProcessor.validateImage()
│    └─> ImageProcessor.processImage()
│       ├─> Apply Operation 1         │
│       ├─> Apply Operation 2         │
│       └─> Apply Operation N         │
│                                     │
│ 4. Storage Controller               │
│    └─> StorageManager.storeImage()  │
│       ├─> Write to disk/cloud       │
│       └─> Store metadata            │
│                                     │
│ 5. Response Builder                 │
│    └─> Return fileId + metadata     │
└────────────┬────────────────────────┘
             │
             │ Response JSON:
             │ {
             │   fileId: UUID,
             │   format: "png",
             │   width: 1920,
             │   height: 1080,
             │   sizeBytes: 2MB,
             │   downloadUrl: "/api/image/download/UUID",
             │   expiresAt: "2024-05-28T14:30:00Z"
             │ }
             │
       ▼─────────────┐
   ┌───────────────┐ │ 6. Client downloads image
   │ Client        │ │    GET /api/image/download/UUID
   │ Receives ID   │─┘
   └───────────────┘
```

---

## 2. Architecture Details

### 2.1 Component Architecture

#### Layer 1: Presentation Layer (Client)
- **Web UI Demo** (HTML5 + JavaScript)
- **REST API Consumers** (Mobile apps, desktop applications)
- **Developer SDKs** (Node.js client library)

#### Layer 2: API Layer (Express.js Server)
- **HTTP Request/Response Handler**
- **Route Definitions** - Maps URLs to handlers
- **Middleware Stack:**
  - CORS handler
  - File upload processor (Multer)
  - Error handler
  - Request validation

#### Layer 3: Business Logic Layer
- **ImageProcessor Service** - Core image transformation
- **Validation Logic** - Operation and format validation
- **Error Handling** - Business rule enforcement

#### Layer 4: Storage/Persistence Layer
- **StorageManager Service** - File management abstraction
- **Metadata Store** - In-memory or database
- **Cleanup Logic** - File expiration handling

#### Layer 5: Data Layer
- **File System** (development) or **Cloud Storage** (production)
  - AWS S3
  - Azure Blob Storage
  - Google Cloud Storage
  - MinIO (self-hosted S3-compatible)

### 2.2 Design Patterns Used

#### 1. **Service Pattern**
- **ImageProcessor** - Encapsulates image processing logic
- **StorageManager** - Encapsulates file management logic
- **Benefit:** Loose coupling, testability, reusability

```
┌────────────────────┐
│  Route Handler     │
└────────┬───────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────────────┐  ┌──────────────────┐
│ImageProcessor  │  │StorageManager    │
│Service         │  │Service           │
├────────────────┤  ├──────────────────┤
│- validateImage │  │- storeImage      │
│- processImage  │  │- getImage        │
│- applyOperation│  │- deleteImage     │
│- getFormats    │  │- getMetadata     │
└────────────────┘  └──────────────────┘
```

#### 2. **Strategy Pattern (for Operations)**
Each image operation is a pluggable strategy:
```
Pipeline = Sharp(image)
  .applyOperation({type: 'fliph'})      // Strategy 1
  .applyOperation({type: 'grayscale'})  // Strategy 2
  .applyOperation({type: 'rotateright'}) // Strategy 3
  .toBuffer()
```

#### 3. **Repository Pattern (Storage Abstraction)**
StorageManager provides interface that can be swapped:
```
// Current implementation: File system
// Can be replaced with:
// - AWS S3Repository
// - AzureBlobRepository
// - GoogleCloudRepository
```

#### 4. **Middleware Pattern (Express.js)**
```
Request → CORS → Upload → Validation → Route → Error → Response
          ↑      ↑        ↑           ↑      ↑
        Middleware Stack (Pluggable)
```

#### 5. **Factory Pattern (Format Handling)**
```
static getFormatOptions(format) {
  switch(format.toLowerCase()) {
    case 'jpeg': return {quality: 80, progressive: true}
    case 'webp': return {quality: 80}
    case 'png': return {compressionLevel: 9}
    default: return {}
  }
}
```

---

## 3. Communication Protocols

### 3.1 REST API Protocol

**Base URL:** `https://api.imageprocessor.example.com/api`

**HTTP Methods:**
- `POST` - Create/process (transform images)
- `GET` - Read (download images, get metadata, health checks)
- `DELETE` - Delete resources (remove images)

**Content-Type:**
- Request: `multipart/form-data` (for file uploads)
- Response: `application/json` (metadata), `image/*` (files)

### 3.2 Request/Response Format

**Typical Transform Request:**
```http
POST /api/process/transform HTTP/1.1
Host: api.imageprocessor.example.com
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="image"; filename="input.jpg"
Content-Type: image/jpeg

[BINARY IMAGE DATA]
------Boundary
Content-Disposition: form-data; name="operations"

[{"type":"fliph"},{"type":"grayscale"},{"type":"rotateright"}]
------Boundary
Content-Disposition: form-data; name="outputFormat"

png
------Boundary--
```

**Successful Response (200 OK):**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "format": "png",
  "width": 1920,
  "height": 1080,
  "sizeBytes": 2048576,
  "downloadUrl": "/api/image/download/550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2024-05-28T14:30:00Z",
  "metadata": {
    "operationsApplied": 3,
    "processingTime": "245ms"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid operations JSON",
  "message": "Operations parameter must be valid JSON array"
}
```

### 3.3 Security Protocols

- **CORS:** Configured for specific origins
- **HTTPS/TLS:** Required in production
- **Rate Limiting:** Per-IP request throttling
- **Input Validation:** All parameters validated
- **File Size Limits:** 50MB max per file
- **UUID-based Access:** Files accessed only via UUID (not predictable)
- **Auto-expiration:** Files deleted after 24 hours

---

## 4. Deployment Architecture

### 4.1 Local Development

```
Developer Machine
├── Backend (Node.js)
│   └── http://localhost:3000
├── Frontend (Static files)
│   └── http://localhost:8080 (or served from backend)
├── Database
│   └── In-memory or SQLite
└── Storage
    └── Local ./uploads directory
```

### 4.2 Cloud Deployment (AWS Example)

```
┌─────────────────────────────────────────────────────────┐
│                    AWS VPC                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Application Load Balancer (ALB)                 │  │
│  │  - HTTPS listener (port 443)                     │  │
│  │  - Health check: /api/status/health              │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                       │
│    ┌────────────┴────────────┬────────────┐            │
│    │                         │            │            │
│  ┌─▼──────────┐  ┌──────────▼─┐  ┌──────▼──────┐    │
│  │ECS Cluster │  │ECS Cluster │  │ ECS Cluster │    │
│  │ (us-east)  │  │(us-west)   │  │ (eu-west)  │    │
│  │            │  │            │  │            │    │
│  │┌──────────┐│  │┌──────────┐│  │┌──────────┐│    │
│  ││ API Task ││  ││ API Task ││  ││ API Task ││    │
│  ││          ││  ││          ││  ││          ││    │
│  │├──────────┤│  │├──────────┤│  │├──────────┤│    │
│  ││Node:3000 ││  ││Node:3000 ││  ││Node:3000 ││    │
│  └──────────┬┘│  └──────────┬┘│  └──────────┬┘    │
│             │   │             │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                                               │
│  ┌──────▼──────────────────────────────────┐          │
│  │         AWS S3 Bucket                   │          │
│  │  (Processed Images Storage)             │          │
│  │  - Encryption at rest                   │          │
│  │  - Versioning enabled                   │          │
│  │  - Lifecycle: delete after 24 hours     │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │    RDS (Optional for metadata)           │         │
│  │    - PostgreSQL/MySQL                    │         │
│  │    - Multi-AZ for HA                     │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │    CloudWatch Monitoring                 │         │
│  │    - Logs                                │         │
│  │    - Metrics                             │         │
│  │    - Alarms                              │         │
│  └──────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose (Local):**
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=development
      - PORT=3000
```

### 4.4 Scaling Strategy

**Horizontal Scaling:**
- Stateless API servers
- Load balancer distributes traffic
- Each server independent

**Storage Scaling:**
- Switch to cloud storage (S3, Blob, GCS)
- Automatic availability and redundancy
- Pay-per-use pricing model

**Database Scaling:**
- Start with in-memory metadata (development)
- Move to managed database (production)
- Caching layer (Redis) for hot data

---

## 5. Architecture Justification

### 5.1 Why REST API?

✓ **Standard HTTP Protocol** - No special infrastructure needed
✓ **Stateless** - Naturally supports horizontal scaling
✓ **Wide Support** - Every platform/language supports HTTP
✓ **Caching** - HTTP caching headers for performance
✓ **Security** - HTTPS/TLS standard
✓ **Monitoring** - Mature tooling for HTTP services

### 5.2 Why Express.js?

✓ **Lightweight** - Minimal overhead, fast startup
✓ **Mature Ecosystem** - Rich package ecosystem
✓ **Middleware Model** - Clean request processing pipeline
✓ **Performance** - Adequate for I/O-bound image processing
✓ **Async/Await** - Native support for non-blocking operations

### 5.3 Why Sharp (libvips)?

✓ **Performance** - C-based, highly optimized
✓ **Features** - Supports all required operations
✓ **Memory Efficient** - Streams large images
✓ **Supported Formats** - PNG, JPEG, WebP, GIF, TIFF, etc.
✓ **Well-Maintained** - Active development and support

### 5.4 Layered Architecture Benefits

✓ **Separation of Concerns** - Each layer has single responsibility
✓ **Testability** - Components independently testable
✓ **Maintainability** - Changes in one layer isolated
✓ **Scalability** - Storage and processing layers independently scalable
✓ **Cloud-Ready** - Each layer replaceable with cloud alternative

### 5.5 Cloud Design Principles

✓ **Stateless** - No server affinity required
✓ **Storage Abstraction** - Works with any S3-compatible storage
✓ **Observable** - Health checks and metrics built-in
✓ **Resilient** - Auto-expiring files prevent storage bloat
✓ **Secure** - UUID-based access, input validation

---

## 6. API Specification

### Complete API Reference

See [API_SPECIFICATION.yaml](API_SPECIFICATION.yaml) for complete OpenAPI 3.0 specification.

### Quick API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/process/transform` | POST | Transform single image |
| `/api/process/batch` | POST | Transform multiple images |
| `/api/process/info` | GET | Get service capabilities |
| `/api/image/download/{fileId}` | GET | Download processed image |
| `/api/image/info/{fileId}` | GET | Get image metadata |
| `/api/image/{fileId}` | DELETE | Delete image |
| `/api/status/health` | GET | Health check |
| `/api/status/ready` | GET | Readiness probe |

---

## 7. Implementation Details

### 7.1 Project Structure

```
Image Processor/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Main Express app
│   │   ├── services/
│   │   │   ├── ImageProcessor.js    # Image transformation logic
│   │   │   └── StorageManager.js    # File management
│   │   ├── routes/
│   │   │   ├── processing.js        # Transform endpoints
│   │   │   ├── retrieval.js         # Download endpoints
│   │   │   └── status.js            # Health checks
│   │   └── middleware/
│   │       ├── errorHandler.js
│   │       └── validation.js
│   ├── uploads/                     # Storage directory
│   ├── API_SPECIFICATION.yaml       # OpenAPI spec
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
├── frontend/
│   ├── ImageProcessorClient.js      # Client SDK
│   └── examples.js                  # Usage examples
├── demo/
│   └── index.html                   # Web UI demo
└── documentation/
    └── ARCHITECTURE.md              # This file
```

### 7.2 Key Implementation Features

#### Async Image Processing Pipeline
```javascript
const pipeline = sharp(imageBuffer);

for (const operation of operations) {
  pipeline = applyOperation(pipeline, operation);
}

const processedBuffer = await pipeline.toBuffer();
```

#### Automatic File Expiration
```javascript
// Each file gets expiration timestamp
metadata.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Periodic cleanup
async cleanupExpired() {
  for (const [fileId, metadata] of this.fileMetadata.entries()) {
    if (new Date(metadata.expiresAt) < now) {
      await this.deleteImage(fileId);
    }
  }
}
```

#### Operation Validation
```javascript
static validateOperations(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('Operations must be non-empty array');
  }
  
  for (const op of operations) {
    if (!supportedOps.includes(op.type)) {
      throw new Error(`Unsupported operation: ${op.type}`);
    }
  }
}
```

---

## 8. Running and Testing

### 8.1 Local Setup

```bash
# Backend
cd backend
npm install
npm run dev

# In another terminal, serve demo
cd demo
npx http-server .

# Access at http://localhost:8080
```

### 8.2 Testing the API

```bash
# Transform image
curl -X POST http://localhost:3000/api/process/transform \
  -F "image=@sample.jpg" \
  -F 'operations=[{"type":"grayscale"},{"type":"fliph"}]' \
  -F "outputFormat=png"

# Download result
curl http://localhost:3000/api/image/download/{fileId} -o result.png

# Get metadata
curl http://localhost:3000/api/image/info/{fileId}

# Health check
curl http://localhost:3000/api/status/health
```

### 8.3 Usage with Client SDK

```javascript
const ImageProcessorClient = require('./frontend/ImageProcessorClient');
const client = new ImageProcessorClient('http://localhost:3000/api');

const result = await client.processImage('./input.jpg', [
  { type: 'fliph' },
  { type: 'grayscale' }
]);

await client.saveImage(result.fileId, './output.png');
```

---

## 9. Security Considerations

### 9.1 Input Validation
- File size limits (50MB)
- MIME type verification
- Operation type whitelist
- Format validation

### 9.2 Data Protection
- Automatic file expiration (24 hours)
- UUID-based file identification (not sequential/predictable)
- No sensitive data in URLs
- Optional: Encryption at rest

### 9.3 Network Security
- HTTPS/TLS in production
- CORS configuration
- Optional: API key authentication
- Optional: Rate limiting

### 9.4 Storage Security
- Cloud storage encryption
- Access control lists
- Audit logging
- Regular backups

---

## 10. Performance Characteristics

### 10.1 Processing Performance

| Operation | Performance | Notes |
|-----------|-------------|-------|
| Flip | < 100ms | In-memory pixel reversal |
| Grayscale | < 200ms | Color space conversion |
| Rotate | < 150ms | Lossless rotation |
| Pipeline (3 ops) | < 500ms | Depends on image size |

### 10.2 Memory Usage

- **Per request:** O(image size) + O(output size)
- **Streaming:** Sharp doesn't load entire image in RAM
- **Multiple concurrent:** Each in separate worker/container

### 10.3 Scalability

- **Single instance:** ~100-200 concurrent requests
- **Cluster:** Linear scaling with instance count
- **Limiting factors:** Image size, operations complexity

---

## 11. Future Enhancements

### 11.1 Near-term
- [ ] Database for persistent metadata
- [ ] Redis caching for common operations
- [ ] WebSocket for progress updates
- [ ] Batch job queue (Bull/RabbitMQ)

### 11.2 Mid-term
- [ ] Advanced filters (blur, sharpen, etc.)
- [ ] Image compression optimization
- [ ] Watermarking support
- [ ] API authentication/authorization
- [ ] Usage analytics dashboard

### 11.3 Long-term
- [ ] ML-based image enhancements
- [ ] Real-time collaboration
- [ ] Plugin system for custom operations
- [ ] Multi-tenancy support

---

## 12. Conclusion

The Image Processor architecture is designed for:
- **Simplicity:** Easy to understand and maintain
- **Scalability:** Horizontal scaling via stateless design
- **Cloud-Ready:** Works with any cloud provider
- **Performance:** Efficient image processing with minimal overhead
- **Security:** Built-in protection against common threats
- **Extensibility:** Service-based design allows for easy additions

The REST API provides a clean interface that developers can easily integrate into their applications, while the cloud-based design ensures the service can grow with demand.

---

## Appendices

### A. Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 4.18+ |
| Image Processing | Sharp | 0.32+ |
| Storage | File System or Cloud | Various |
| Containerization | Docker | Latest |
| Deployment | Kubernetes/ECS/Cloud Run | N/A |

### B. Configuration Examples

#### Production Environment (.env)
```
PORT=3000
NODE_ENV=production
STORAGE_PATH=/mnt/storage
MAX_FILE_SIZE=50mb
FILE_RETENTION_HOURS=24
CORS_ORIGIN=https://myapp.com
LOG_LEVEL=warn
AWS_REGION=us-east-1
S3_BUCKET=image-processor-prod
```

### C. Monitoring and Observability

**Metrics to Track:**
- Request count
- Processing time (p50, p95, p99)
- Error rate
- Storage usage
- File cleanup rate
- Cache hit ratio

**Health Checks:**
- `/api/status/health` - Service health
- `/api/status/ready` - Readiness for load balancer

---

**Document Version:** 1.0
**Last Updated:** May 2024
**Status:** Final Architecture Document
