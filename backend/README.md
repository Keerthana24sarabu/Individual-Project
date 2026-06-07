# Backend

A Node.js Express backend for image processing.

## Run

```bash
cd backend
npm install
npm start
```

The server listens on `http://localhost:3000`.

## Configuration

The backend supports the following environment variables:

- `PORT` - server port
- `NODE_ENV` - environment mode
- `STORAGE_PATH` - local or mounted directory for uploaded and processed images
- `MAX_FILE_SIZE` - maximum upload size
- `FILE_RETENTION_HOURS` - how long processed files are kept
- `CORS_ORIGIN` - allowed origins for browser clients

## API

- `POST /api/process/transform`
- `GET /api/image/download/{fileId}`
- `GET /api/image/info/{fileId}`
- `GET /api/process/info`
- `GET /api/status/health`
