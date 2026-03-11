# SongTimeManager Storage Server

A simple Node.js/Express server that provides a REST API for managing storage data files.

## Features

- **GET /api/storage** - List all storage files
- **GET /api/storage/:id** - Get a specific storage file
- **POST /api/storage** - Upload a new storage file
- **DELETE /api/storage/:id** - Delete a storage file
- **Static file serving** - Files in Storage folder are accessible via /storage/

## Installation

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will start on http://localhost:3000

## API Endpoints

### List all storage files
```bash
GET /api/storage
```

Response:
```json
[
  {
    "id": "storage_1234567890_sample",
    "filename": "storage_1234567890_sample.json",
    "name": "My Backup",
    "remark": "Sample backup",
    "lastModified": "2026-03-11T00:00:00.000Z",
    "dataTypes": ["Songs", "Settings"]
  }
]
```

### Get a specific storage file
```bash
GET /api/storage/:id
```

### Upload a new storage file
```bash
POST /api/storage
Content-Type: application/json

{
  "name": "Backup Name",
  "remark": "Optional remark",
  "data": {
    "songData": { ... },
    "settings": { ... }
  }
}
```

### Delete a storage file
```bash
DELETE /api/storage/:id
```

## Running with the Client

1. Start the server: `npm start` (runs on port 3000)
2. The client will automatically detect the server and use it for storage
3. If the server is not available, the client falls back to IndexedDB

## Configuration

- **Port**: Change `PORT` in `server.js` (default: 3000)
- **Storage folder**: Files are stored in the `../Storage` folder (relative to server.js)
- **CORS**: Enabled for all origins (configure in server.js for production)
