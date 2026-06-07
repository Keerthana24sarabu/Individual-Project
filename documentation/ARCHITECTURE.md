# Architecture

This project is a simple image processing service.

## Components

- `backend/` - Express.js API server
- `demo/` - Basic browser UI for uploading images
- `frontend/` - Client helper library

## How it works

1. The client uploads an image to `POST /api/process/transform`.
2. The backend applies selected operations.
3. The backend stores the result and returns a `fileId`.
4. The client fetches the image from `GET /api/image/download/{fileId}`.

## Supported transformations

- `fliph` - flip horizontal
- `flipv` - flip vertical
- `grayscale` - convert to grayscale
- `rotateleft` - rotate left 90°
- `rotateright` - rotate right 90°

## Storage

Images are stored on disk in `backend/uploads` by default, with processed file metadata persisted to a local metadata store.

The storage manager is designed to be replaceable with a cloud object store such as AWS S3 or Azure Blob Storage, and it supports configurable retention windows so temporary files are not kept indefinitely.
