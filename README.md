# Image Processor

A simple image transformation service with a backend API, lightweight web demo, and client helper.

## Run locally

1. Start the backend:
```bash
cd backend
npm install
npm start
```

2. Open `demo/index.html` in your browser.

“Start the backend first, then open index.html in a browser”

The backend is designed to run as a web API and can be deployed to cloud or container platforms by using environment-configured storage and retention settings.

## What it does

- Flip horizontal / vertical
- Convert image to grayscale
- Rotate left / right
- Output as PNG, JPEG, WebP, GIF, TIFF

## Project structure

- `backend/` - Express API server
- `demo/` - Browser demo UI
- `frontend/` - Client helper and examples
- `documentation/` - Short project docs
