# Backend

A Node.js Express backend for image processing.

## Run

```bash
cd backend
npm install
npm start
```

The server listens on `http://localhost:3000`.

## API

- `POST /api/process/transform`
- `GET /api/image/download/{fileId}`
- `GET /api/image/info/{fileId}`
- `GET /api/process/info`
- `GET /api/status/health`
