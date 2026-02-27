
        // Load current settings on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            loadSongList();
            // Apply language to dynamic content
            if (typeof applyLanguage === 'function') {
                applyLanguage();
            }
            
            // Initialize searchable dropdowns for Import tab
            initImportSongTypeDropdown();
        });

        // Initialize Import tab song type dropdown
        function initImportSongTypeDropdown() {
            const input = document.getElementById('importSongType');
            const dropdown = document.getElementById('importSongTypeDropdown');
            
            if (!input || !dropdown) return;
            
            // Get all existing song types
            const songs = getSongData();
            const songTypes = [...new Set(Object.values(songs).map(s => s.songType).filter(Boolean))];
            
            // Also get custom song types from storage
            const customTypes = JSON.parse(localStorage.getItem('customSongTypes') || '[]');
            const allTypes = [...new Set([...songTypes, ...customTypes])];
            
            input.addEventListener('focus', function() {
                dropdown.innerHTML = allTypes.map(type => 
                    `<div class="dropdown-item" onclick="selectImportSongType('${type.replace(/'/g, "\\'")}')">${type}</div>`
                ).join('');
                if (customTypes.length > 0) {
                    dropdown.innerHTML += `<div class="dropdown-item dropdown-item-new" onclick="selectImportSongType(this.textContent)">+ Add new type</div>`;
                }
                dropdown.classList.add('show');
            });
            
            input.addEventListener('input', function() {
                const value = this.value.toLowerCase();
                const filtered = allTypes.filter(type => type.toLowerCase().includes(value));
                dropdown.innerHTML = filtered.map(type => 
                    `<div class="dropdown-item" onclick="selectImportSongType('${type.replace(/'/g, "\\'")}')">${type}</div>`
                ).join('');
                if (value && !allTypes.some(t => t.toLowerCase() === value)) {
                    dropdown.innerHTML += `<div class="dropdown-item dropdown-item-new" onclick="selectImportSongType('${value.replace(/'/g, "\\'")}')">+ Add "${value}"</div>`;
                }
                dropdown.classList.add('show');
            });
            
            document.addEventListener('click', function(e) {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }

        function selectImportSongType(value) {
            document.getElementById('importSongType').value = value;
            document.getElementById('importSongTypeDropdown').classList.remove('show');
            
            // Save as custom type if new
            const customTypes = JSON.parse(localStorage.getItem('customSongTypes') || '[]');
            if (!customTypes.includes(value)) {
                customTypes.push(value);
                localStorage.setItem('customSongTypes', JSON.stringify(customTypes));
            }
        }

        // Tab Navigation
        function showSettingsTab(tabId, event) {
            // Hide all tab contents
            document.querySelectorAll('.settings-tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            // Remove active from all tabs
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            const targetTab = document.getElementById(tabId + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Add active to clicked tab - handle both with and without event
            if (event && event.target) {
                const clickedTab = event.target.closest('.settings-tab');
                if (clickedTab) {
                    clickedTab.classList.add('active');
                }
            } else {
                // Fallback: find the button that matches the tabId
                document.querySelectorAll('.settings-tab').forEach(tab => {
                    if (tab.getAttribute('onclick')?.includes(tabId)) {
                        tab.classList.add('active');
                    }
                });
            }

            // Load song list when switching to song management tab
            if (tabId === 'song-management') {
                loadSongList();
            }
        }

        // Song Management Functions
        let allSongs = [];

        function loadSongList() {
            const songs = getSongData();
            allSongs = Object.entries(songs).map(([key, song]) => ({
                key: key,
                ...song
            }));
            filterSongList();
        }

        function filterSongList() {
            const searchTerm = document.getElementById('songSearchInput').value.toLowerCase().trim();
            const container = document.getElementById('songListContainer');
            
            let filteredSongs = allSongs;
            if (searchTerm) {
                filteredSongs = allSongs.filter(song => {
                    return song.name.toLowerCase().includes(searchTerm) ||
                           (song.nameEnglish && song.nameEnglish.toLowerCase().includes(searchTerm)) ||
                           song.singer.toLowerCase().includes(searchTerm) ||
                           (song.singerEnglish && song.singerEnglish.toLowerCase().includes(searchTerm)) ||
                           (song.songType && song.songType.toLowerCase().includes(searchTerm));
                });
            }

            // Update count
            document.getElementById('songTotalCount').textContent = allSongs.length;

            if (filteredSongs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-music"></i>
                        <p data-en="No songs found" data-ja="曲が見つかりません">No songs found</p>
                    </div>
                `;
                return;
            }

            // Sort by count (most played first)
            filteredSongs.sort((a, b) => b.count - a.count);

            container.innerHTML = filteredSongs.map(song => `
                <div class="song-item">
                    <div class="song-item-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="song-item-info">
                        <div class="song-item-name">
                            ${escapeHtml(song.name)}
                            ${song.nameEnglish ? `<span class="english">(${escapeHtml(song.nameEnglish)})</span>` : ''}
                            ${song.songType ? `<span class="song-type-badge">${escapeHtml(song.songType)}</span>` : ''}
                        </div>
                        <div class="song-item-meta">
                            <span><i class="fas fa-microphone"></i> ${escapeHtml(song.singer || 'Unknown')}${song.singerEnglish ? ` (${escapeHtml(song.singerEnglish)})` : ''}</span>
                            ${song.duration ? `<span><i class="fas fa-clock"></i> ${escapeHtml(song.duration)}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> ${song.dates ? song.dates.length : 0} dates</span>
                        </div>
                    </div>
                    <div class="song-item-count">${song.count} plays</div>
                    <div class="song-item-actions">
                        <button class="edit" onclick="openEditSongModal('${escapeHtml(song.key)}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete" onclick="deleteSong('${escapeHtml(song.key)}')" title="Delete all entries">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function openEditSongModal(key) {
            const songs = getSongData();
            const song = songs[key];
            
            if (!song) return;

            document.getElementById('editSongKey').value = key;
            document.getElementById('editSongName').value = song.name || '';
            document.getElementById('editSongNameEnglish').value = song.nameEnglish || '';
            document.getElementById('editSongSinger').value = song.singer || '';
            document.getElementById('editSongSingerEnglish').value = song.singerEnglish || '';
            document.getElementById('editSongType').value = song.songType || '';
            document.getElementById('editSongDuration').value = song.duration || '';

            document.getElementById('editSongModal').classList.add('active');
        }

        function closeEditSongModal() {
            document.getElementById('editSongModal').classList.remove('active');
        }

        function saveEditedSong() {
            const oldKey = document.getElementById('editSongKey').value;
            const newName = document.getElementById('editSongName').value.trim();
            const newNameEnglish = document.getElementById('editSongNameEnglish').value.trim();
            const newSinger = document.getElementById('editSongSinger').value.trim();
            const newSingerEnglish = document.getElementById('editSongSingerEnglish').value.trim();
            const newSongType = document.getElementById('editSongType').value.trim();
            const newDuration = document.getElementById('editSongDuration').value.trim();

            if (!newName) {
                alert(translations[currentLang]?.['Please enter a song name'] || 'Please enter a song name');
                return;
            }

            const songs = getSongData();
            const oldSong = songs[oldKey];

            if (!oldSong) {
                closeEditSongModal();
                return;
            }

            // Generate new key
            const newKey = `${newName.toLowerCase()}_${newSinger.toLowerCase()}`;

            // Check if key will change
            if (oldKey !== newKey) {
                // Check if new key already exists
                if (songs[newKey]) {
                    if (!confirm(translations[currentLang]?.['A song with this name and singer already exists. Do you want to merge them?'] || 'A song with this name and singer already exists. Do you want to merge them?')) {
                        return;
                    }
                    // Merge with existing song
                    const existingSong = songs[newKey];
                    existingSong.count += oldSong.count;
                    existingSong.entries = [...existingSong.entries, ...oldSong.entries];
                    
                    // Update dates
                    if (oldSong.dates) {
                        oldSong.dates.forEach(date => {
                            if (!existingSong.dates.includes(date)) {
                                existingSong.dates.push(date);
                            }
                        });
                    }

                    // Delete old song
                    delete songs[oldKey];
                } else {
                    // Create new entry with new key
                    songs[newKey] = {
                        id: oldSong.id,
                        name: newName,
                        nameEnglish: newNameEnglish,
                        singer: newSinger,
                        singerEnglish: newSingerEnglish,
                        songType: newSongType,
                        duration: newDuration,
                        date: oldSong.date,
                        dates: oldSong.dates || [],
                        count: oldSong.count,
                        entries: oldSong.entries.map(entry => ({
                            ...entry,
                            name: newName,
                            nameEnglish: newNameEnglish,
                            singer: newSinger,
                            singerEnglish: newSingerEnglish,
                            songType: newSongType,
                            duration: newDuration
                        }))
                    };
                    delete songs[oldKey];
                }
            } else {
                // Update in place
                songs[oldKey] = {
                    ...oldSong,
                    name: newName,
                    nameEnglish: newNameEnglish,
                    singer: newSinger,
                    singerEnglish: newSingerEnglish,
                    songType: newSongType,
                    duration: newDuration,
                    entries: oldSong.entries.map(entry => ({
                        ...entry,
                        name: newName,
                        nameEnglish: newNameEnglish,
                        singer: newSinger,
                        singerEnglish: newSingerEnglish,
                        songType: newSongType,
                        duration: newDuration
                    }))
                };
            }

            saveSongData(songs);
            closeEditSongModal();
            loadSongList();
            
            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.querySelector('span').textContent = translations[currentLang]?.['Song updated successfully!'] || 'Song updated successfully!';
            successMsg.classList.add('show');
            setTimeout(() => {
                successMsg.classList.remove('show');
                successMsg.querySelector('span').textContent = translations[currentLang]?.['Settings saved successfully!'] || 'Settings saved successfully!';
            }, 3000);
        }

        function deleteSong(key) {
            if (!confirm(translations[currentLang]?.['Are you sure you want to delete ALL entries of this song? This cannot be undone.'] || 'Are you sure you want to delete ALL entries of this song? This cannot be undone.')) {
                return;
            }

            const songs = getSongData();
            const song = songs[key];
            
            if (!song) return;

            // Delete the song
            delete songs[key];
            saveSongData(songs);

            // Reload the list
            loadSongList();
            
            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.querySelector('span').textContent = translations[currentLang]?.['Song deleted successfully!'] || 'Song deleted successfully!';
            successMsg.classList.add('show');
            setTimeout(() => {
                successMsg.classList.remove('show');
                successMsg.querySelector('span').textContent = translations[currentLang]?.['Settings saved successfully!'] || 'Settings saved successfully!';
            }, 3000);
        }

        // Close modal on outside click
        document.getElementById('editSongModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditSongModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeEditSongModal();
            }
        });
        
        function loadSettings() {
            const settings = JSON.parse(localStorage.getItem('youtubeChannelSettings')) || {};
            
            // Update current displays
            updateCurrentDisplays(settings);
            
            // Load preview if settings exist
            if (settings.channelId || settings.previewUrl) {
                loadPreview(settings.channelId, settings.previewUrl);
            } else if (settings.channelUrl) {
                // Try to get channel ID from URL and load preview
                const channelId = extractChannelId(settings.channelUrl);
                if (channelId) {
                    loadPreview(channelId, null);
                }
            }
        }
        
        async function loadPreview(channelId, previewUrl) {
            const previewSection = document.getElementById('previewSection');
            const previewGrid = document.getElementById('previewGrid');
            
            previewSection.style.display = 'block';
            
            // If preview URL is provided, show it first
            if (previewUrl) {
                const videoId = extractVideoId(previewUrl);
                if (videoId) {
                    previewGrid.innerHTML = `
                        <a href="${previewUrl}" target="_blank" class="preview-card" style="grid-column: 1 / -1;">
                            <div class="preview-card-thumb">
                                <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" alt="Preview Video">
                            </div>
                            <div class="preview-card-info">
                                <div class="preview-card-title"><i class="fas fa-play"></i> Featured Preview Video</div>
                                <div class="preview-card-date">Click to watch on YouTube</div>
                            </div>
                        </a>
                    `;
                    
                    // Also load channel videos below
                    if (channelId) {
                        loadChannelVideos(channelId, previewGrid);
                    }
                    return;
                }
            }
            
            // If no preview URL but channel ID exists, get latest video from channel
            if (channelId) {
                await loadLatestFromChannel(channelId, previewGrid);
            } else {
                previewGrid.innerHTML = '<div class="no-preview"><i class="fas fa-video-slash"></i><p>No preview available</p></div>';
            }
        }
        
        async function loadLatestFromChannel(channelId, container) {
            container.innerHTML = '<div class="no-preview"><i class="fas fa-spinner fa-spin"></i><p>Loading latest video...</p></div>';
            
            // Use a CORS proxy service
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            
            try {
                // Try with CORS proxy
                const response = await fetch(proxyUrl + encodeURIComponent(RSS_URL));
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                
                const entry = xml.querySelector('entry');
                
                if (entry) {
                    const videoId = entry.querySelector('videoId')?.textContent || '';
                    const title = entry.querySelector('title')?.textContent || 'Latest Video';
                    const published = new Date(entry.querySelector('published')?.textContent || '').toLocaleDateString();
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    // Show latest video as preview
                    container.innerHTML = `
                        <a href="${videoUrl}" target="_blank" class="preview-card" style="grid-column: 1 / -1;">
                            <div class="preview-card-thumb">
                                <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" alt="${title}">
                            </div>
                            <div class="preview-card-info">
                                <div class="preview-card-title"><i class="fas fa-play"></i> Latest: ${title}</div>
                                <div class="preview-card-date">${published} - Click to watch on YouTube</div>
                            </div>
                        </a>
                    `;
                    
                    // Also load more videos below
                    loadChannelVideos(channelId, container, true);
                } else {
                    showChannelLink(channelId, container);
                }
            } catch (error) {
                console.error('Error loading latest video:', error);
                showChannelLink(channelId, container);
            }
        }
        
        function showChannelLink(channelId, container) {
            const channelUrl = `https://www.youtube.com/channel/${channelId}`;
            container.innerHTML = `
                <a href="${channelUrl}/videos" target="_blank" class="preview-card" style="grid-column: 1 / -1;">
                    <div class="preview-card-thumb">
                        <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" alt="YouTube Channel">
                    </div>
                    <div class="preview-card-info">
                        <div class="preview-card-title"><i class="fas fa-play"></i> Click to view latest videos on YouTube</div>
                        <div class="preview-card-date">Open YouTube Channel</div>
                    </div>
                </a>
            `;
        }
        
        async function loadChannelVideos(channelId, container, append = false) {
            if (!append) {
                container.innerHTML = '<div class="no-preview"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
            }
            
            const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            
            try {
                const response = await fetch(RSS_URL);
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                
                const entries = xml.querySelectorAll('entry');
                
                if (entries.length > 0) {
                    // Skip the first video if we're appending (it's already shown as preview)
                    const startIndex = append ? 1 : 0;
                    const videos = Array.from(entries).slice(startIndex, startIndex + 4).map(entry => {
                        const videoId = entry.querySelector('videoId')?.textContent || '';
                        const title = entry.querySelector('title')?.textContent || 'Untitled';
                        const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        const published = new Date(entry.querySelector('published')?.textContent || '').toLocaleDateString();
                        
                        return { videoId, title, thumbnail, published };
                    });
                    
                    const videosHtml = videos.map(v => `
                        <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="preview-card">
                            <div class="preview-card-thumb">
                                <img src="${v.thumbnail}" alt="${v.title}">
                            </div>
                            <div class="preview-card-info">
                                <div class="preview-card-title">${v.title}</div>
                                <div class="preview-card-date">${v.published}</div>
                            </div>
                        </a>
                    `).join('');
                    
                    if (append && container.querySelector('.preview-card')) {
                        container.innerHTML += videosHtml;
                    } else {
                        container.innerHTML = videosHtml;
                    }
                }
            } catch (error) {
                console.error('Error loading preview:', error);
            }
        }
        
        function extractVideoId(url) {
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
                /^([a-zA-Z0-9_-]{11})$/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
        
        function saveSettings() {
            const channelUrl = document.getElementById('youtubeChannelUrl').value.trim();
            const channelName = document.getElementById('channelName').value.trim();
            const previewUrl = document.getElementById('previewUrl').value.trim();
            
            // Extract channel ID from URL (if URL is provided)
            let channelId = null;
            if (channelUrl) {
                channelId = extractChannelId(channelUrl);
                if (!channelId) {
                    alert('Invalid YouTube channel URL. Please use a URL like: https://www.youtube.com/channel/UC...');
                    return;
                }
            }
            
            // Allow saving empty settings (to clear)
            const settings = {
                channelUrl: channelUrl,
                channelId: channelId,
                channelName: channelName || '',
                previewUrl: previewUrl
            };
            
            localStorage.setItem('youtubeChannelSettings', JSON.stringify(settings));
            
            // Clear the form fields after saving
            document.getElementById('youtubeChannelUrl').value = '';
            document.getElementById('channelName').value = '';
            document.getElementById('previewUrl').value = '';
            
            // Update the "Current:" displays
            updateCurrentDisplays(settings);
            
            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.classList.add('show');
            
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);
            
            // Load preview after saving (or clear it if empty)
            if (channelId || previewUrl) {
                loadPreview(channelId, previewUrl);
            }
        }
        
        function updateCurrentDisplays(settings) {
            const currentText = translations[currentLang]?.['Current:'] || 'Current:';
            const notSetText = translations[currentLang]?.['Not set'] || 'Not set';
            
            // Update channel URL display
            const channelUrlEl = document.getElementById('currentChannelUrl');
            if (settings.channelUrl) {
                channelUrlEl.innerHTML = `${currentText} <strong></strong>`;
                channelUrlEl.querySelector('strong').textContent = settings.channelUrl;
            } else {
                channelUrlEl.innerHTML = `${currentText} <strong>${notSetText}</strong>`;
            }
            
            // Update channel name display
            const channelNameEl = document.getElementById('currentChannelName');
            if (settings.channelName) {
                channelNameEl.innerHTML = `${currentText} <strong></strong>`;
                channelNameEl.querySelector('strong').textContent = settings.channelName;
            } else {
                channelNameEl.innerHTML = `${currentText} <strong>${notSetText}</strong>`;
            }
            
            // Update preview URL display
            const previewUrlEl = document.getElementById('currentPreviewUrl');
            if (settings.previewUrl) {
                previewUrlEl.innerHTML = `${currentText} <strong></strong>`;
                previewUrlEl.querySelector('strong').textContent = settings.previewUrl;
            } else {
                previewUrlEl.innerHTML = `${currentText} <strong>${notSetText}</strong>`;
            }
        }
        
        function extractChannelId(url) {
            // Extract channel ID from various YouTube URL formats
            const patterns = [
                /youtube\.com\/channel\/([a-zA-Z0-9_-]{22})/,
                /youtube\.com\/@([a-zA-Z0-9_-]{3,})/,
                /youtube\.com\/c\/([a-zA-Z0-9_-]{3,})/,
                /youtu\.be\/([a-zA-Z0-9_-]{11})/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
        
        function exportData() {
            const songs = getSongData();
            const dataStr = JSON.stringify(songs, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'song_list_data.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const songs = JSON.parse(e.target.result);
                    if (Array.isArray(songs)) {
                        // Save imported songs
                        localStorage.setItem('songs', JSON.stringify(songs));
                        alert('Data imported successfully! ' + songs.length + ' songs loaded.');
                    } else {
                        alert('Invalid data format. Please import a JSON array.');
                    }
                } catch (error) {
                    alert('Error reading file: ' + error.message);
                }
            };
            reader.readAsText(file);
            // Reset input so same file can be selected again
            event.target.value = '';
        }
        
        function clearData() {
            if (confirm('Are you sure you want to clear all song data? This cannot be undone.')) {
                localStorage.removeItem('songData');
                localStorage.removeItem('songs');
                localStorage.removeItem('songSequences');
                localStorage.removeItem('customSongTypes');
                alert('All data has been cleared.');
            }
        }


    