/**
 * Song List Manager - Shared JavaScript
 */

// Data storage functions
function getSongData() {
    try {
        const data = localStorage.getItem('songData');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error reading song data:', error);
        return {};
    }
}

function saveSongData(data) {
    try {
        localStorage.setItem('songData', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving song data:', error);
        alert('Failed to save data. Storage may be full.');
    }
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
        let date;
        
        // Check if it's a string that looks like a number (Excel serial date)
        if (typeof dateStr === 'string' && /^\d+$/.test(dateStr)) {
            // Excel serial date: days since 1900-01-01
            const serial = parseInt(dateStr, 10);
            // Convert Excel serial date to JavaScript date
            // Excel epoch is 1899-12-30 (for JavaScript Date compatibility)
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
        } else if (typeof dateStr === 'number') {
            // Already a number - treat as Excel serial
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
        } else {
            date = new Date(dateStr);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        
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
        'Song List Manager': 'Song List Manager',
        'Song Summary': 'Song Summary',
        'Random Pick': 'Random Pick',
        'Settings': 'Settings',
        'Settings - Song List Manager': 'Settings - Song List Manager',
        'Live Stream': 'Live Stream',
        'Settings saved successfully!': 'Settings saved successfully!',
        'Current:': 'Current:',
        'Not set': 'Not set',
        
        // Settings page
        'YouTube Channel': 'YouTube Channel',
        'YouTube Channel URL': 'YouTube Channel URL',
        'Display Name': 'Display Name',
        'Preview Video URL (Optional)': 'Preview Video URL (Optional)',
        'Enter your YouTube channel URL (e.g., https://www.youtube.com/channel/UC7A7bGRVdIwo93nA3x-OQ)': 'Enter your YouTube channel URL (e.g., https://www.youtube.com/channel/UC7A7bGRVdIwo93nA3x-OQ)',
        'Custom name to display for the channel': 'Custom name to display for the channel',
        'Enter a specific YouTube video URL to show as the main preview': 'Enter a specific YouTube video URL to show as the main preview',
        'Save Settings': 'Save Settings',
        'Go to Live Stream Page': 'Go to Live Stream Page',
        'Data Management': 'Data Management',
        'Data': 'Data',
        'Export All Data': 'Export All Data',
        'Import Data': 'Import Data',
        'Clear All Data': 'Clear All Data',
        
        // Song Management
        'Song Management': 'Song Management',
        'Search songs...': 'Search songs...',
        'Total songs:': 'Total songs:',
        'No songs found': 'No songs found',
        'Edit Song': 'Edit Song',
        'Song Name': 'Song Name',
        'Song Name (English)': 'Song Name (English)',
        'Singer': 'Singer',
        'Singer (English)': 'Singer (English)',
        'Song Type': 'Song Type',
        'Duration': 'Duration',
        'Cancel': 'Cancel',
        'Save Changes': 'Save Changes',
        'Editing will update all song entries with the same name and singer.': 'Editing will update all song entries with the same name and singer.',
        'Song updated successfully!': 'Song updated successfully!',
        'Song deleted successfully!': 'Song deleted successfully!',
        'Are you sure you want to delete ALL entries of this song? This cannot be undone.': 'Are you sure you want to delete ALL entries of this song? This cannot be undone.',
        'A song with this name and singer already exists. Do you want to merge them?': 'A song with this name and singer already exists. Do you want to merge them?',
        
        // Alert messages
        'Please enter some songs to import': 'Please enter some songs to import',
        'No valid songs found to import': 'No valid songs found to import',
        'No songs to import': 'No songs to import',
        'Successfully imported': 'Successfully imported',
        'songs!': 'songs!',
        'Please enter a song name': 'Please enter a song name',
        'Song added successfully!': 'Song added successfully!',
        'No valid songs found in the file': 'No valid songs found in the file',
        'No valid songs found in the Excel file': 'No valid songs found in the Excel file',
        'Error reading Excel file. Please make sure the file format is correct.': 'Error reading Excel file. Please make sure the file format is correct.',
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
        'Stars': 'Stars',
        
        // Random Pick page
        'Pick Random Songs': 'Pick Random Songs',
        'Number of songs to pick:': 'Number of songs to pick:',
        'Filter by Singer:': 'Filter by Singer:',
        'Filter by Song Type:': 'Filter by Song Type:',
        'Pick Songs': 'Pick Songs',
        'Selected Songs': 'Selected Songs',
        'Copy All': 'Copy All',
        'No songs selected yet': 'No songs selected yet',
        'Enter a number and click Pick Songs': 'Enter a number and click Pick Songs',
        
        // Empty states
        'No songs yet': 'No songs yet',
        'Top 10 Most Played Songs': 'Top 10 Most Played Songs',
        'Top Singers': 'Top Singers',
        'Recently Added': 'Recently Added',
        'Songs by Date': 'Songs by Date'
    },
    ja: {
        // Navigation
        'Song List Manager': '曲列表管理',
        'Song Summary': '曲まとめ',
        'Random Pick': 'ランダムピック',
        'Settings': '設定',
        'Settings - Song List Manager': '設定 - 曲列表管理',
        'Live Stream': 'ライブ配信',
        'Settings saved successfully!': '設定が保存されました！',
        'Current:': '現在:',
        'Not set': '未設定',
        
        // Settings page
        'YouTube Channel': 'YouTubeチャンネル',
        'YouTube Channel URL': 'YouTubeチャンネルURL',
        'Display Name': '表示名',
        'Preview Video URL (Optional)': 'プレビュー動画URL (任意)',
        'Enter your YouTube channel URL (e.g., https://www.youtube.com/channel/UC7A7bGRVdIwo93nA3x-OQ)': 'YouTubeチャンネルURLを入力 (例: https://www.youtube.com/channel/UC7A7bGRVdIwo93nA3x-OQ)',
        'Custom name to display for the channel': 'チャンネルに表示するカスタム名',
        'Enter a specific YouTube video URL to show as the main preview': 'メインプレビューとして表示するYouTube動画URLを入力',
        'Save Settings': '設定を保存',
        'Go to Live Stream Page': 'ライブ配信ページへ',
        'Data Management': 'データ管理',
        'Data': 'データ',
        'Export All Data': '全データをエクスポート',
        'Import Data': 'データをインポート',
        'Clear All Data': '全データを削除',
        
        // Song Management
        'Song Management': '曲管理',
        'Search songs...': '曲を検索...',
        'Total songs:': '総曲数:',
        'No songs found': '曲が見つかりません',
        'Edit Song': '曲を編集',
        'Song Name': '曲名',
        'Song Name (English)': '曲名 (英語)',
        'Singer': '歌手',
        'Singer (English)': '歌手 (英語)',
        'Song Type': '曲タイプ',
        'Duration': '長さ',
        'Cancel': 'キャンセル',
        'Save Changes': '変更を保存',
        'Editing will update all song entries with the same name and singer.': '同じ曲名と歌手のすべての曲エントリが更新されます。',
        'Song updated successfully!': '曲が正常に更新されました！',
        'Song deleted successfully!': '曲が正常に削除されました！',
        'Are you sure you want to delete ALL entries of this song? This cannot be undone.': 'この曲的全データを削除してもよろしいですか？この操作は取り消せません。',
        'A song with this name and singer already exists. Do you want to merge them?': '同じ曲名と歌手を持つ曲が既に存在します。統合しますか？',
        
        // Alert messages
        'Please enter some songs to import': 'インポートする曲を入力してください',
        'No valid songs found to import': 'インポートする有効な曲が見つかりません',
        'No songs to import': 'インポートする曲がありません',
        'Successfully imported': '正常にインポートしました',
        'songs!': '件の曲!',
        'Please enter a song name': '曲名を入力してください',
        'Song added successfully!': '曲が正常に追加されました！',
        'No valid songs found in the file': 'ファイル内に有効な曲が見つかりません',
        'No valid songs found in the Excel file': 'Excelファイル内に有効な曲が見つかりません',
        'Error reading Excel file. Please make sure the file format is correct.': 'Excelファイルの読み取りエラー。ファイル形式が正しいことを確認してください。',
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
        'No data yet': 'データがありません',
        'No recent activity': '最近の活動はありません',
        'No songs yet': '曲がありません',
        
        // Labels
        'plays': '回',
        'New': '新着',
        'Live': 'ライブ',
        'Hot': '人気',
        'Stars': 'スター',
        
        // Random Pick page
        'Pick Random Songs': '曲をランダム選択',
        'Number of songs to pick:': '選択する曲数:',
        'Filter by Singer:': '歌手でフィルター:',
        'Filter by Song Type:': '曲タイプでフィルター:',
        'Pick Songs': '曲をピック',
        'Selected Songs': '選択された曲',
        'Copy All': '全てコピー',
        'No songs selected yet': 'まだ曲が選択されていません',
        'Enter a number and click Pick Songs': '数を入力してピックボタンをクリック',
        
        // Empty states
        'No songs yet': '曲がありません',
        'Top 10 Most Played Songs': '再生回数トップ10',
        'Top Singers': '歌手ランキング',
        'Recently Added': '最近追加',
        'Songs by Date': '日付別曲'
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
    
    // Update page title with data-en and data-ja attributes
    const titleEl = document.querySelector('title[data-en]');
    if (titleEl) {
        const key = titleEl.getAttribute('data-en');
        if (translations[currentLang] && translations[currentLang][key]) {
            document.title = translations[currentLang][key];
        }
    }
    
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
