/**
 * Storage Page JavaScript
 * Handles uploading, displaying, restoring, and deleting storage data
 * 
 * Storage approach:
 * - Server API (primary): For sharing data between users
 * - IndexedDB (fallback): For offline use when server is unavailable
 */

// Server API base URL - update this to match your server address
const API_BASE_URL = 'http://localhost:3000/api';

// IndexedDB for offline fallback
const DB_NAME = 'SongTimeManagerStorage';
const DB_VERSION = 1;
const STORE_NAME = 'storageData';
let db = null;

// Storage metadata in localStorage
const STORAGE_META_KEY = 'storageMeta';

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function(event) {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Check if server is available
 */
async function checkServerAvailable() {
    try {
        const response = await fetch(`${API_BASE_URL}/storage`, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch (error) {
        console.log('Server not available, using local storage');
        return false;
    }
}

/**
 * Server API functions
 */
async function serverGetStorageList() {
    const response = await fetch(`${API_BASE_URL}/storage`);
    if (!response.ok) throw new Error('Failed to fetch storage list');
    return response.json();
}

async function serverGetStorage(id) {
    const response = await fetch(`${API_BASE_URL}/storage/${id}`);
    if (!response.ok) throw new Error('Failed to fetch storage');
    return response.json();
}

async function serverUploadStorage(data) {
    const response = await fetch(`${API_BASE_URL}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to upload storage');
    return response.json();
}

async function serverDeleteStorage(id) {
    const response = await fetch(`${API_BASE_URL}/storage/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete storage');
    return response.json();
}

/**
 * IndexedDB functions (fallback)
 */
function saveStorageDataToDB(id, data) {
    return new Promise((resolve, reject) => {
        initDB().then(() => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ id: id, data: data });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        }).catch(reject);
    });
}

function getStorageDataFromDB(id) {
    return new Promise((resolve, reject) => {
        initDB().then(() => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        }).catch(reject);
    });
}

function deleteStorageDataFromDB(id) {
    return new Promise((resolve, reject) => {
        initDB().then(() => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        }).catch(reject);
    });
}

/**
 * Get storage metadata from localStorage
 */
function getStorageMeta() {
    try {
        const data = localStorage.getItem(STORAGE_META_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading storage metadata:', error);
        return [];
    }
}

/**
 * Save storage metadata to localStorage
 */
function saveStorageMeta(meta) {
    try {
        localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    } catch (error) {
        console.error('Error saving storage metadata:', error);
    }
}

// Global state
let useServer = false;

// Load storage list on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if server is available
    useServer = await checkServerAvailable();
    
    if (useServer) {
        console.log('Using server API for storage');
        loadStorageFromServer();
    } else {
        console.log('Using local storage (IndexedDB)');
        await initDB();
        loadStorageList();
    }
    
    if (typeof applyLanguage === 'function') {
        applyLanguage();
    }
});

/**
 * Load storage list from server
 */
async function loadStorageFromServer() {
    try {
        const storageList = await serverGetStorageList();
        const container = document.getElementById('storageListContainer');
        
        if (!storageList || storageList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p data-en="No stored data yet. Upload your first backup above." data-ja="保存されたデータがありません。最初のバックアップをアップロードしてください。">No stored data yet. Upload your first backup above.</p>
                </div>
            `;
            return;
        }
        
        // Add source indicator
        storageList.forEach(s => s.source = 'server');
        
        container.innerHTML = storageList.map(storage => `
            <div class="storage-item">
                <div class="storage-item-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="storage-item-info">
                    <div class="storage-item-name">
                        ${escapeHtml(storage.name)}
                        ${storage.remark ? `<span class="storage-remark">${escapeHtml(storage.remark)}</span>` : ''}
                    </div>
                    <div class="storage-item-meta">
                        <span><i class="fas fa-clock"></i> ${formatDateTime(storage.lastModified)}</span>
                        ${storage.dataTypes ? `<span><i class="fas fa-tags"></i> ${storage.dataTypes.join(', ')}</span>` : ''}
                        <span class="storage-source"><i class="fas fa-cloud"></i> Server</span>
                    </div>
                </div>
                <div class="storage-item-actions">
                    <button class="btn btn-sm btn-primary" onclick="openRestoreModal('${storage.id}')" title="Restore">
                        <i class="fas fa-download"></i> <span data-en="Restore" data-ja="復元">Restore</span>
                    </button>
                    <button class="btn btn-sm" onclick="downloadStorageData('${storage.id}')" title="Download">
                        <i class="fas fa-file-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${storage.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading from server:', error);
        // Fall back to local
        useServer = false;
        await initDB();
        loadStorageList();
    }
}

/**
 * Load storage list (local fallback)
 */
function loadStorageList() {
    const storageMeta = getStorageMeta();
    const container = document.getElementById('storageListContainer');
    
    if (!storageMeta || storageMeta.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p data-en="No stored data yet. Upload your first backup above." data-ja="保存されたデータがありません。最初のバックアップをアップロードしてください。">No stored data yet. Upload your first backup above.</p>
            </div>
        `;
        return;
    }
    
    storageMeta.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    container.innerHTML = storageMeta.map(storage => `
        <div class="storage-item">
            <div class="storage-item-icon">
                <i class="fas fa-database"></i>
            </div>
            <div class="storage-item-info">
                <div class="storage-item-name">
                    ${escapeHtml(storage.name)}
                    ${storage.remark ? `<span class="storage-remark">${escapeHtml(storage.remark)}</span>` : ''}
                </div>
                <div class="storage-item-meta">
                    <span><i class="fas fa-clock"></i> ${formatDateTime(storage.lastModified)}</span>
                    ${storage.dataTypes ? `<span><i class="fas fa-tags"></i> ${storage.dataTypes.join(', ')}</span>` : ''}
                    <span class="storage-source"><i class="fas fa-user"></i> Local</span>
                </div>
            </div>
            <div class="storage-item-actions">
                <button class="btn btn-sm btn-primary" onclick="openRestoreModal('${storage.id}')" title="Restore">
                    <i class="fas fa-download"></i> <span data-en="Restore" data-ja="復元">Restore</span>
                </button>
                <button class="btn btn-sm" onclick="downloadStorageData('${storage.id}')" title="Download">
                    <i class="fas fa-file-download"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${storage.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Upload storage data
 */
async function uploadStorageData() {
    const name = document.getElementById('storageName').value.trim();
    const remark = document.getElementById('storageRemark').value.trim();
    
    if (!name) {
        showError(translations[currentLang]?.['Please enter a name'] || 'Please enter a name');
        return;
    }
    
    // Collect data
    const storageData = {};
    const dataTypes = [];
    
    if (document.getElementById('uploadSongData').checked) {
        const songData = localStorage.getItem('songData');
        console.log('Song data exists:', !!songData);
        if (songData) {
            storageData.songData = JSON.parse(songData);
            dataTypes.push('Songs');
        }
    }
    
    if (document.getElementById('uploadSettings').checked) {
        const settings = localStorage.getItem('youtubeChannelSettings');
        console.log('Settings exists:', !!settings);
        if (settings) {
            storageData.settings = JSON.parse(settings);
            dataTypes.push('Settings');
        }
    }
    
    if (document.getElementById('uploadSequences').checked) {
        const sequences = localStorage.getItem('songSequences');
        console.log('Sequences exists:', !!sequences);
        if (sequences) {
            storageData.sequences = JSON.parse(sequences);
            dataTypes.push('Sequences');
        }
    }
    
    if (document.getElementById('uploadCustomTypes').checked) {
        const customTypes = localStorage.getItem('customSongTypes');
        console.log('Custom types exists:', !!customTypes, customTypes);
        if (customTypes) {
            storageData.customTypes = JSON.parse(customTypes);
            dataTypes.push('Custom Types');
        }
    }
    
    console.log('Uploading data types:', dataTypes);
    console.log('Storage data keys:', Object.keys(storageData));
    
    if (Object.keys(storageData).length === 0) {
        showError(translations[currentLang]?.['No data selected to upload'] || 'No data selected to upload');
        return;
    }
    
    const uploadData = {
        name: name,
        remark: remark,
        data: storageData
    };
    
    try {
        if (useServer) {
            // Upload to server
            const result = await serverUploadStorage(uploadData);
            showSuccess(translations[currentLang]?.['Data uploaded to server!'] || 'Data uploaded to server!');
            loadStorageFromServer();
        } else {
            // Save locally
            const storageId = 'storage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await saveStorageDataToDB(storageId, storageData);
            
            const storageMeta = getStorageMeta();
            storageMeta.push({
                id: storageId,
                name: name,
                remark: remark,
                lastModified: new Date().toISOString(),
                dataTypes: dataTypes,
                source: 'local'
            });
            saveStorageMeta(storageMeta);
            
            showSuccess(translations[currentLang]?.['Data uploaded successfully!'] || 'Data uploaded successfully!');
            loadStorageList();
        }
        
        document.getElementById('storageName').value = '';
        document.getElementById('storageRemark').value = '';
        
    } catch (error) {
        console.error('Error uploading:', error);
        showError('Failed to upload: ' + error.message);
    }
}

/**
 * Get storage data by ID
 */
async function getStorageDataById(id) {
    try {
        if (useServer) {
            const data = await serverGetStorage(id);
            return data.data;
        } else {
            const result = await getStorageDataFromDB(id);
            return result ? result.data : null;
        }
    } catch (error) {
        console.error('Error getting storage data:', error);
        return null;
    }
}

/**
 * Open restore modal - allow user to select which data to restore
 */
async function openRestoreModal(storageId) {
    const storageData = await getStorageDataById(storageId);
    
    console.log('Storage data for restore:', storageData);
    
    if (!storageData) {
        showError('Storage data not found');
        return;
    }
    
    document.getElementById('restoreStorageId').value = storageId;
    
    const optionsContainer = document.getElementById('restoreOptions');
    let optionsHtml = '';
    
    // Show checkboxes for each available data type (all checked by default)
    if (storageData.songData) {
        const count = Object.keys(storageData.songData).length;
        optionsHtml += `<label class="checkbox-label"><input type="checkbox" id="restoreSongData" checked> <span data-en="Song Data" data-ja="曲データ">Song Data</span> ${count > 0 ? `(${count} items)` : ''}</label>`;
    }
    if (storageData.settings) {
        optionsHtml += `<label class="checkbox-label"><input type="checkbox" id="restoreSettings" checked> <span data-en="Settings" data-ja="設定">Settings</span></label>`;
    }
    if (storageData.sequences) {
        const count = Object.keys(storageData.sequences).length;
        optionsHtml += `<label class="checkbox-label"><input type="checkbox" id="restoreSequences" checked> <span data-en="Song Sequences" data-ja="曲シーケンス">Song Sequences</span> ${count > 0 ? `(${count} items)` : ''}</label>`;
    }
    if (storageData.customTypes) {
        const count = Array.isArray(storageData.customTypes) ? storageData.customTypes.length : 0;
        optionsHtml += `<label class="checkbox-label"><input type="checkbox" id="restoreCustomTypes" checked> <span data-en="Custom Song Types" data-ja="カスタム曲タイプ">Custom Song Types</span> ${count > 0 ? `(${count} items)` : ''}</label>`;
    }
    
    if (!optionsHtml) {
        optionsHtml = '<p>No data available to restore</p>';
    }
    
    optionsContainer.innerHTML = optionsHtml;
    
    document.getElementById('restoreModal').classList.add('active');
}

function closeRestoreModal() {
    document.getElementById('restoreModal').classList.remove('active');
    document.getElementById('restoreStorageId').value = '';
}

/**
 * Confirm restore - restore selected data types
 */
async function confirmRestore() {
    const storageId = document.getElementById('restoreStorageId').value;
    const storageData = await getStorageDataById(storageId);
    
    if (!storageData) {
        showError('Storage data not found');
        return;
    }
    
    try {
        // Restore selected data types based on checkboxes
        if (document.getElementById('restoreSongData')?.checked && storageData.songData) {
            localStorage.setItem('songData', JSON.stringify(storageData.songData));
        }
        if (document.getElementById('restoreSettings')?.checked && storageData.settings) {
            localStorage.setItem('youtubeChannelSettings', JSON.stringify(storageData.settings));
        }
        if (document.getElementById('restoreSequences')?.checked && storageData.sequences) {
            localStorage.setItem('songSequences', JSON.stringify(storageData.sequences));
        }
        if (document.getElementById('restoreCustomTypes')?.checked && storageData.customTypes) {
            localStorage.setItem('customSongTypes', JSON.stringify(storageData.customTypes));
        }
        
        closeRestoreModal();
        showSuccess(translations[currentLang]?.['Data restored successfully!'] || 'Data restored successfully!');
    } catch (error) {
        console.error('Error restoring:', error);
        showError('Failed to restore data: ' + error.message);
    }
}

/**
 * Download storage data
 */
async function downloadStorageData(storageId) {
    try {
        let data, name, remark, lastModified;
        
        if (useServer) {
            const result = await serverGetStorage(storageId);
            data = result.data;
            name = result.name;
            remark = result.remark;
            lastModified = result.lastModified;
        } else {
            const result = await getStorageDataById(storageId);
            const meta = getStorageMeta().find(s => s.id === storageId);
            data = result;
            name = meta?.name || 'backup';
            remark = meta?.remark || '';
            lastModified = meta?.lastModified || new Date().toISOString();
        }
        
        const exportData = { name, remark, lastModified, data };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storage_${name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading:', error);
        showError('Failed to download');
    }
}

/**
 * Import from file
 */
function importStorageFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!importedData.name || !importedData.data) {
                showError('Invalid storage file format');
                return;
            }
            
            if (useServer) {
                await serverUploadStorage(importedData);
                showSuccess('Data imported to server!');
                loadStorageFromServer();
            } else {
                const storageId = 'storage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await saveStorageDataToDB(storageId, importedData.data);
                
                const dataTypes = [];
                if (importedData.data.songData) dataTypes.push('Songs');
                if (importedData.data.settings) dataTypes.push('Settings');
                if (importedData.data.sequences) dataTypes.push('Sequences');
                if (importedData.data.customTypes) dataTypes.push('Custom Types');
                
                const storageMeta = getStorageMeta();
                storageMeta.push({
                    id: storageId,
                    name: importedData.name,
                    remark: importedData.remark || '',
                    lastModified: importedData.lastModified || new Date().toISOString(),
                    dataTypes: dataTypes,
                    source: 'imported'
                });
                saveStorageMeta(storageMeta);
                
                showSuccess(translations[currentLang]?.['Data imported successfully!'] || 'Data imported successfully!');
                loadStorageList();
            }
        } catch (error) {
            console.error('Error importing:', error);
            showError('Failed to import: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function openDeleteModal(storageId) {
    document.getElementById('deleteStorageId').value = storageId;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.getElementById('deleteStorageId').value = '';
}

async function confirmDelete() {
    const storageId = document.getElementById('deleteStorageId').value;
    
    try {
        if (useServer) {
            await serverDeleteStorage(storageId);
            loadStorageFromServer();
        } else {
            await deleteStorageDataFromDB(storageId);
            const meta = getStorageMeta().filter(s => s.id !== storageId);
            saveStorageMeta(meta);
            loadStorageList();
        }
        
        closeDeleteModal();
        showSuccess(translations[currentLang]?.['Data deleted successfully!'] || 'Data deleted successfully!');
    } catch (error) {
        console.error('Error deleting:', error);
        showError('Failed to delete');
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '';
    try {
        return new Date(isoString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch { return isoString; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    const el = document.getElementById('successMessage');
    el.querySelector('span').textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showError(message) {
    const el = document.getElementById('errorMessage');
    el.querySelector('span').textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
}

// Close modals on outside click
document.getElementById('restoreModal')?.addEventListener('click', e => { if (e.target === this) closeRestoreModal(); });
document.getElementById('deleteModal')?.addEventListener('click', e => { if (e.target === this) closeDeleteModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeRestoreModal(); closeDeleteModal(); } });
