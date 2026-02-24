/**
 * Song List Manager - Shared JavaScript
 */

// Data storage functions
function getSongData() {
    return JSON.parse(localStorage.getItem('songData')) || {};
}

function saveSongData(data) {
    localStorage.setItem('songData', JSON.stringify(data));
}

/**
 * Group songs by name and singer only (ignoring date)
 */
function groupSongs(songs) {
    const grouped = {};
    
    songs.forEach(song => {
        // Group only by name and singer
        const key = `${song.name.toLowerCase()}_${(song.singer || '').toLowerCase()}`;
        if (grouped[key]) {
            grouped[key].count++;
            // Add to entries
            grouped[key].entries.push(song);
            // Update dates list if needed
            if (song.date && !grouped[key].dates.includes(song.date)) {
                grouped[key].dates.push(song.date);
            }
        } else {
            grouped[key] = {
                name: song.name,
                singer: song.singer,
                date: song.date, // Show first date
                dates: song.date ? [song.date] : [],
                count: 1,
                entries: [song]
            };
        }
    });
    
    return grouped;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return dateStr;
    }
}

/**
 * Get today's date string
 */
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Delete a song entry
 */
function deleteSongEntry(id) {
    if (!confirm('Are you sure you want to delete this song entry?')) {
        return false;
    }
    
    let songs = getSongData();
    const songKey = Object.keys(songs).find(key => songs[key].id === id);
    
    if (songKey) {
        if (songs[songKey].count > 1) {
            songs[songKey].count--;
            // Remove one entry from the entries array
            songs[songKey].entries = songs[songKey].entries.filter(e => e.id !== id);
        } else {
            delete songs[songKey];
        }
    }
    
    saveSongData(songs);
    return true;
}

/**
 * Delete a grouped song (all entries)
 */
function deleteGroupedSong(key) {
    if (!confirm('Are you sure you want to delete ALL entries of this song?')) {
        return false;
    }
    
    let songs = getSongData();
    delete songs[key];
    saveSongData(songs);
    return true;
}

/**
 * Import songs from text
 */
function importSongs(text) {
    const songs = getSongData();
    const lines = text.split(/\n/).map(s => s.trim()).filter(s => s);
    let addedCount = 0;
    
    // Skip first line (header/title)
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
        // Skip empty lines
        if (!line.trim()) return;
        
        // Try to parse: Song Name, Singer, Date
        const parts = line.split(/[,;|]+/).map(p => p.trim());
        const name = parts[0];
        const singer = parts[1] || '';
        const date = parts[2] || getTodayString();
        
        if (name) {
            // Group only by name and singer
            const key = `${name.toLowerCase()}_${singer.toLowerCase()}`;
            
            if (songs[key]) {
                songs[key].count++;
                songs[key].entries.push({
                    id: Date.now() + Math.random(),
                    name: name,
                    singer: singer,
                    date: date,
                    addedDate: new Date().toDateString()
                });
                // Add to dates if new
                if (date && !songs[key].dates.includes(date)) {
                    songs[key].dates.push(date);
                }
            } else {
                songs[key] = {
                    id: Date.now() + Math.random(),
                    name: name,
                    singer: singer,
                    date: date,
                    dates: date ? [date] : [],
                    count: 1,
                    entries: [{
                        id: Date.now() + Math.random(),
                        name: name,
                        singer: singer,
                        date: date,
                        addedDate: new Date().toDateString()
                    }]
                };
            }
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        saveSongData(songs);
    }
    
    return addedCount;
}

/**
 * Get statistics
 */
function getStats() {
    const songs = Object.values(getSongData());
    
    const uniqueSongs = songs.length;
    const totalPlays = songs.reduce((sum, s) => sum + s.count, 0);
    const mostPlayed = songs.length > 0 ? Math.max(...songs.map(s => s.count)) : 0;
    
    // Get all entries
    const allEntries = songs.flatMap(s => s.entries || []);
    
    // Singer stats - count unique singers from grouped songs
    const uniqueSingers = new Set(songs.map(s => s.singer || 'Unknown')).size;
    
    const singerCounts = {};
    songs.forEach(song => {
        const singer = song.singer || 'Unknown';
        singerCounts[singer] = (singerCounts[singer] || 0) + song.count;
    });
    
    const topSingers = Object.entries(singerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Top songs
    const topSongs = songs
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    return {
        uniqueSongs,
        totalPlays,
        mostPlayed,
        uniqueSingers,
        topSingers,
        topSongs,
        totalEntries: allEntries.length
    };
}

/**
 * Export songs to CSV
 */
function exportToCSV() {
    const songs = getSongData();
    let csv = 'Song Name,Singer,Date,Play Count\n';
    
    Object.values(songs).forEach(song => {
        csv += `"${song.name}","${song.singer || ''}","${song.date || ''}",${song.count}\n`;
    });
    
    // Add UTF-8 BOM for Japanese support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'songs_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Export songs to XLSX
 */
function exportToXLSX() {
    const songs = getSongData();
    
    // Prepare data for Excel
    const data = [['Song Name', 'Singer', 'Date', 'Play Count']];
    
    Object.values(songs).forEach(song => {
        data.push([
            song.name,
            song.singer || '',
            song.date || '',
            song.count
        ]);
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Songs');
    
    // Download file
    XLSX.writeFile(wb, 'songs_export.xlsx');
}

/**
 * Clear all data
 */
function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL songs? This cannot be undone!')) {
        return false;
    }
    
    localStorage.removeItem('songData');
    return true;
}

/**
 * Language Support
 */
const translations = {
    en: {
        // Navigation
        'Import': 'Import',
        'All Songs': 'All Songs',
        'By Date': 'By Date',
        
        // Dashboard
        'Dashboard': 'Dashboard',
        'Unique Song & Singer Groups': 'Unique Song & Singer Groups',
        'Total Song Entries': 'Total Song Entries',
        'Unique Singers': 'Unique Singers',
        
        // Import page
        'Add Single Song': 'Add Single Song',
        'Bulk Import': 'Bulk Import',
        'Import from File': 'Import from File',
        'Song Name': 'Song Name',
        'Enter song name': 'Enter song name',
        'Singer': 'Singer',
        'Enter singer name': 'Enter singer name',
        'Duration (Start ~ End)': 'Duration (Start ~ End)',
        'Duration': 'Duration',
        'Date': 'Date',
        'Add Song': 'Add Song',
        'Import Songs': 'Import Songs',
        'Format: Start Time ~ End Time | Song Name | Singer | Date': 'Format: Start Time ~ End Time | Song Name | Singer | Date',
        'Import All': 'Import All',
        'Choose File': 'Choose File',
        'Download Template': 'Download Template',
        'Supported formats': 'Supported formats',
        
        // All Songs page
        'Filter by song name, singer, or date...': 'Filter by song name, singer, or date...',
        'Newest First': 'Newest First',
        'Oldest First': 'Oldest First',
        'A-Z': 'A-Z',
        'All Song Entries': 'All Song Entries',
        'entries': 'entries',
        'Clear All': 'Clear All',
        
        // Songs by Date
        'Filter by Date': 'Filter by Date',
        'Clear': 'Clear',
        'Show All Dates': 'Show All Dates',
        'Song List': 'Song List',
        'songs': 'songs',
        
        // Common
        'Export XLSX': 'Export XLSX',
        'Export CSV': 'Export CSV',
        'No songs imported yet': 'No songs imported yet',
        'No matching songs found': 'No matching songs found',
        'Select a date to view songs': 'Select a date to view songs',
        'No songs found on this date': 'No songs found on this date',
        
        // Import preview
        'Preview Import': 'Preview Import',
        'songs to import': 'songs to import',
        'Cancel': 'Cancel',
        'Import All': 'Import All',
        'Successfully imported': 'Successfully imported',
        'songs!': 'songs!',
        
        // Empty states
        'No data yet': 'No data yet',
        'No recent activity': 'No recent activity',
        
        // Labels
        'plays': 'plays',
        'New': 'New',
        'Live': 'Live',
        'Hot': 'Hot',
        'Stars': 'Stars'
    },
    ja: {
        // Navigation
        'Import': 'インポート',
        'All Songs': '全曲',
        'By Date': '日付順',
        
        // Dashboard
        'Dashboard': 'ダッシュボード',
        'Unique Song & Singer Groups': 'ユニークな曲と歌手グループ',
        'Total Song Entries': '総曲数',
        'Unique Singers': 'ユニークな歌手数',
        
        // Import page
        'Add Single Song': '单曲追加',
        'Bulk Import': '一括インポート',
        'Import from File': 'ファイルからインポート',
        'Song Name': '曲名',
        'Enter song name': '曲名を入力',
        'Singer': '歌手',
        'Enter singer name': '歌手名を入力',
        'Duration (Start ~ End)': '時間 (開始 ~ 終了)',
        'Duration': '時間',
        'Date': '日付',
        'Add Song': '追加',
        'Import Songs': '曲をインポート',
        'Format: Start Time ~ End Time | Song Name | Singer | Date': '形式: 開始時間 ~ 終了時間 | 曲名 | 歌手 | 日付',
        'Import All': '全てインポート',
        'Choose File': 'ファイルを選択',
        'Download Template': 'テンプレートダウンロード',
        'Supported formats': '対応形式',
        'Add Song': '追加',
        
        // All Songs page
        'Filter by song name, singer, or date...': '曲名、歌手、日付で検索...',
        'Newest First': '新しい順',
        'Oldest First': '古い順',
        'A-Z': 'アルファベット順',
        'All Song Entries': '全曲リスト',
        'entries': '件',
        'Clear All': '全て削除',
        
        // Songs by Date
        'Filter by Date': '日付で検索',
        'Clear': 'クリア',
        'Show All Dates': '全日付を表示',
        'Song List': '曲リスト',
        'songs': '曲',
        
        // Common
        'Export XLSX': 'XLSXエクスポート',
        'Export CSV': 'CSVエクスポート',
        'No songs imported yet': 'まだ曲がインポートされていません',
        'No matching songs found': '一致する曲が見つかりません',
        'Select a date to view songs': '日付を選択して曲を表示',
        'No songs found on this date': 'この日付に曲がありません',
        
        // Import preview
        'Preview Import': 'インポートプレビュー',
        'songs to import': '件の曲がインポートされます',
        'Cancel': 'キャンセル',
        'Import All': '全てインポート',
        'Successfully imported': '正常にインポートしました',
        'songs!': '件の曲!',
        
        // Empty states
        'No data yet': 'データなし',
        'No recent activity': '最近のアクティビティなし',
        
        // Labels
        'plays': '回',
        'New': '新着',
        'Live': 'ライブ',
        'Hot': '人気',
        'Stars': 'スター'
    }
};

// Current language
let currentLang = localStorage.getItem('language') || 'en';

/**
 * Toggle language between English and Japanese
 */
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ja' : 'en';
    localStorage.setItem('language', currentLang);
    applyLanguage();
    return false;
}

/**
 * Apply current language to all elements
 */
function applyLanguage() {
    // Update language toggle label
    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
        langLabel.textContent = currentLang.toUpperCase();
    }
    
    // Update all elements with data-en and data-ja attributes (for text content)
    document.querySelectorAll('[data-en]').forEach(el => {
        const key = el.getAttribute('data-en');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
    
    // Update all elements with data-en-label attribute (for text content)
    document.querySelectorAll('[data-en-label]').forEach(el => {
        const key = el.getAttribute('data-en-label');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
    
    // Update placeholders with data-en-placeholder and data-ja-placeholder
    document.querySelectorAll('[data-en-placeholder]').forEach(el => {
        if (currentLang === 'ja' && el.hasAttribute('data-ja-placeholder')) {
            el.placeholder = el.getAttribute('data-ja-placeholder');
        } else {
            el.placeholder = el.getAttribute('data-en-placeholder');
        }
    });
}

// Apply language on page load
document.addEventListener('DOMContentLoaded', function() {
    applyLanguage();
});
