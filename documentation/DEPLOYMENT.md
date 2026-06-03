# Deployment

## Local development

1. Open a terminal and start the backend:
```bash
cd backend
npm install
npm start
```

2. Open `demo/index.html` in your browser.

## Docker

Build and run the backend with Docker:
```bash
docker build -t image-processor ./backend
docker run -p 3000:3000 image-processor
```

The API will be available at `http://localhost:3000/api`.
