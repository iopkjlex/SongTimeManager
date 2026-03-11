/**
 * SongTimeManager Storage Server
 * 
 * This server provides a REST API for managing storage data files.
 * It reads/writes JSON files from the Storage folder to share data between users.
 * 
 * API Endpoints:
 * - GET  /api/storage          - List all storage files
 * - GET  /api/storage/:id      - Get a specific storage file
 * - POST /api/storage          - Create/upload a new storage file
 * - DELETE /api/storage/:id    - Delete a storage file
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the main project folder
const PROJECT_ROOT = path.join(__dirname, '..');
app.use(express.static(PROJECT_ROOT));

// Storage path - relative to project root
const STORAGE_DIR = path.join(__dirname, '..', 'Storage');

// Ensure Storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, STORAGE_DIR);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const filename = 'storage_' + uniqueSuffix + '.json';
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        // Only accept JSON files
        if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'), false);
        }
    }
});

// Helper function to get all storage files
function getStorageFiles() {
    const files = fs.readdirSync(STORAGE_DIR);
    return files
        .filter(file => file.endsWith('.json') && file !== 'index.json')
        .map(file => {
            const filePath = path.join(STORAGE_DIR, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                const data = JSON.parse(content);
                return {
                    id: path.parse(file).name,
                    filename: file,
                    name: data.name || 'Unnamed',
                    remark: data.remark || '',
                    lastModified: data.lastModified || stats.mtime.toISOString(),
                    dataTypes: data.data ? Object.keys(data.data).map(key => {
                        if (key === 'songData') return 'Songs';
                        if (key === 'settings') return 'Settings';
                        if (key === 'sequences') return 'Sequences';
                        if (key === 'customTypes') return 'Custom Types';
                        return key;
                    }) : []
                };
            } catch (e) {
                return {
                    id: path.parse(file).name,
                    filename: file,
                    name: file,
                    remark: '',
                    lastModified: stats.mtime.toISOString(),
                    dataTypes: [],
                    error: 'Invalid JSON'
                };
            }
        });
}

// GET /api/storage - List all storage files
app.get('/api/storage', (req, res) => {
    try {
        const files = getStorageFiles();
        // Sort by last modified (newest first)
        files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        res.json(files);
    } catch (error) {
        console.error('Error listing storage files:', error);
        res.status(500).json({ error: 'Failed to list storage files' });
    }
});

// GET /api/storage/:id - Get a specific storage file
app.get('/api/storage/:id', (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(STORAGE_DIR, `${id}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Storage file not found' });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        res.json(data);
    } catch (error) {
        console.error('Error reading storage file:', error);
        res.status(500).json({ error: 'Failed to read storage file' });
    }
});

// POST /api/storage - Create/upload a new storage file
app.post('/api/storage', upload.single('file'), (req, res) => {
    try {
        let storageData;
        
        // Check if file was uploaded
        if (req.file) {
            // Read uploaded file
            const content = fs.readFileSync(req.file.path, 'utf8');
            storageData = JSON.parse(content);
        } else if (req.body.data) {
            // Data sent directly in body
            storageData = req.body;
        } else {
            return res.status(400).json({ error: 'No data provided' });
        }
        
        // Validate required fields
        if (!storageData.name || !storageData.data) {
            return res.status(400).json({ error: 'Invalid storage format: missing name or data' });
        }
        
        // Generate filename
        const timestamp = Date.now();
        const safeName = storageData.name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const filename = `storage_${timestamp}_${safeName}.json`;
        const filePath = path.join(STORAGE_DIR, filename);
        
        // Add metadata
        const exportData = {
            id: path.parse(filename).name,
            name: storageData.name,
            remark: storageData.remark || '',
            lastModified: new Date().toISOString(),
            data: storageData.data
        };
        
        // Write file
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
        
        res.json({
            success: true,
            id: exportData.id,
            filename: filename,
            message: 'Storage file created successfully'
        });
    } catch (error) {
        console.error('Error creating storage file:', error);
        res.status(500).json({ error: 'Failed to create storage file: ' + error.message });
    }
});

// DELETE /api/storage/:id - Delete a storage file
app.delete('/api/storage/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the file with the matching id
        const files = fs.readdirSync(STORAGE_DIR);
        const matchingFile = files.find(file => {
            const fileId = path.parse(file).name;
            return fileId === id || fileId.startsWith(id);
        });
        
        if (!matchingFile) {
            return res.status(404).json({ error: 'Storage file not found' });
        }
        
        const filePath = path.join(STORAGE_DIR, matchingFile);
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            message: 'Storage file deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting storage file:', error);
        res.status(500).json({ error: 'Failed to delete storage file' });
    }
});

// Serve static files from Storage folder (for sharing)
app.use('/storage', express.static(STORAGE_DIR));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`SongTimeManager Storage Server running on http://localhost:${PORT}`);
    console.log(`Storage folder: ${STORAGE_DIR}`);
});
