
        // Tab functionality
        function showTab(tabId) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active from all tabs
            document.querySelectorAll('.summary-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabId).classList.add('active');
            
            // Add active to clicked tab
            event.target.closest('.summary-tab').classList.add('active');
            
            // Load data for the tab
            if (tabId === 'dashboard') {
                loadDashboardData();
            } else if (tabId === 'allsongs') {
                initAllSongsLazyLoad();
            } else if (tabId === 'bydate') {
                initSongsByDateLazyLoad();
            } else if (tabId === 'import') {
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('importDate').value = today;
                document.getElementById('bulkDate').value = today;
                document.getElementById('fileDate').value = today;
            }
        }

        // ============ Lazy Loading for All Songs ============
        const ITEMS_PER_PAGE = 50;
        let allSongsPage = 0;
        let allSongsHasMore = true;
        let allSongsData = [];
        let allSongsLoaded = false;

        function initAllSongsLazyLoad() {
            if (allSongsLoaded) return;
            
            allSongsPage = 0;
            allSongsHasMore = true;
            allSongsData = [];
            allSongsLoaded = true;
            
            const songs = Object.values(getSongData());
            
            // Filter by song type if filter is set
            const songTypeFilter = document.getElementById('songTypeFilter')?.value;
            let filteredSongs = songTypeFilter ? songs.filter(song => song.songType === songTypeFilter) : songs;
            
            // Sort by count descending
            filteredSongs.sort((a, b) => b.count - a.count);
            allSongsData = filteredSongs;
            
            // Load first batch
            loadMoreAllSongs();
        }

        function loadMoreAllSongs() {
            const container = document.getElementById('allSongsList');
            const start = allSongsPage * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const batch = allSongsData.slice(start, end);
            
            if (batch.length === 0) {
                allSongsHasMore = false;
                return;
            }
            
            const html = batch.map(song => {
                return `
                <div class="list-item">
                    <div class="list-item-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="list-item-info">
                        <div class="list-item-name">${song.name}${song.nameEnglish ? ` (${song.nameEnglish})` : ''}${song.songType ? ` <span class="song-type-badge">${song.songType}</span>` : ''}</div>
                        <div class="list-item-meta">
                            <span><i class="fas fa-microphone"></i> ${song.singer || 'Unknown'}${song.singerEnglish ? ` (${song.singerEnglish})` : ''}</span>
                            ${song.duration ? `<span><i class="fas fa-clock"></i> ${song.duration}</span>` : ''}
                        </div>
                    </div>
                    <div class="list-item-count">${song.count}</div>
                </div>
            `}).join('');
            
            if (allSongsPage === 0) {
                container.innerHTML = html;
            } else {
                container.innerHTML += html;
            }
            
            allSongsPage++;
            
            if (end >= allSongsData.length) {
                allSongsHasMore = false;
            }
            
            // Add loading indicator if there's more data
            updateAllSongsLoadingIndicator();
        }

        function updateAllSongsLoadingIndicator() {
            const container = document.getElementById('allSongsList');
            const existingIndicator = document.getElementById('allSongsLoadingIndicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            if (allSongsHasMore) {
                const indicator = document.createElement('div');
                indicator.id = 'allSongsLoadingIndicator';
                indicator.className = 'lazy-load-indicator';
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading more...';
                indicator.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary); cursor: pointer;';
                indicator.onclick = loadMoreAllSongs;
                container.appendChild(indicator);
            } else if (allSongsData.length > 0) {
                const indicator = document.createElement('div');
                indicator.id = 'allSongsLoadingIndicator';
                indicator.className = 'lazy-load-indicator';
                indicator.innerHTML = `<i class="fas fa-check"></i> Showing all ${allSongsData.length} songs`;
                indicator.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary);';
                container.appendChild(indicator);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-music"></i>
                        <p>No songs yet</p>
                    </div>
                `;
            }
        }

        // ============ Lazy Loading for Songs by Date ============
        let byDatePage = 0;
        let byDateHasMore = true;
        let byDateData = [];
        let byDateLoaded = false;

        function initSongsByDateLazyLoad() {
            if (byDateLoaded) return;
            
            byDatePage = 0;
            byDateHasMore = true;
            byDateData = [];
            byDateLoaded = true;
            
            const songs = getSongData();
            
            // Get all entries with their dates
            let allEntries = [];
            Object.values(songs).forEach(song => {
                if (song.entries && song.entries.length > 0) {
                    song.entries.forEach(entry => {
                        allEntries.push({
                            name: song.name,
                            nameEnglish: song.nameEnglish || entry.nameEnglish || '',
                            singer: song.singer,
                            singerEnglish: song.singerEnglish || entry.singerEnglish || '',
                            songType: song.songType || entry.songType || '',
                            duration: entry.duration,
                            date: entry.date,
                            sequence: entry.sequence || 0
                        });
                    });
                }
            });
            
            // Group by date
            const groupedByDate = {};
            allEntries.forEach(entry => {
                const date = entry.date || 'Unknown';
                if (!groupedByDate[date]) {
                    groupedByDate[date] = [];
                }
                groupedByDate[date].push(entry);
            });
            
            // Sort dates (newest first)
            const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
            
            // Store sorted dates with their entries
            byDateData = dates.map(date => {
                const entries = groupedByDate[date].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                return { date, entries };
            });
            
            // Load first batch
            loadMoreSongsByDate();
        }

        function loadMoreSongsByDate() {
            const container = document.getElementById('songsList');
            const start = byDatePage * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const batch = byDateData.slice(start, end);
            
            if (byDateData.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar"></i>
                        <p>No songs yet</p>
                    </div>
                `;
                return;
            }
            
            if (batch.length === 0) {
                byDateHasMore = false;
                return;
            }
            
            const html = batch.map(group => {
                return `
                    <div class="date-group">
                        <div class="date-header">
                            <i class="fas fa-calendar"></i> ${formatDate(group.date)} (${group.entries.length} songs)
                        </div>
                        ${group.entries.map(entry => `
                            <div class="list-item">
                                <div class="list-item-sequence">#${entry.sequence || '-'}</div>
                                <div class="list-item-icon">
                                    <i class="fas fa-music"></i>
                                </div>
                                <div class="list-item-info">
                                    <div class="list-item-name">${entry.name}${entry.nameEnglish ? ` (${entry.nameEnglish})` : ''}${entry.songType ? ` <span class="song-type-badge">${entry.songType}</span>` : ''}</div>
                                    <div class="list-item-meta">
                                        <span><i class="fas fa-microphone"></i> ${entry.singer || 'Unknown'}${entry.singerEnglish ? ` (${entry.singerEnglish})` : ''}</span>
                                        ${entry.duration ? `<span><i class="fas fa-clock"></i> ${entry.duration}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }).join('');
            
            if (byDatePage === 0) {
                container.innerHTML = html;
            } else {
                container.innerHTML += html;
            }
            
            byDatePage++;
            
            if (end >= byDateData.length) {
                byDateHasMore = false;
            }
            
            // Add loading indicator if there's more data
            updateSongsByDateLoadingIndicator();
        }

        function updateSongsByDateLoadingIndicator() {
            const container = document.getElementById('songsList');
            const existingIndicator = document.getElementById('byDateLoadingIndicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            const totalSongs = byDateData.reduce((sum, group) => sum + group.entries.length, 0);
            
            if (byDateHasMore) {
                const indicator = document.createElement('div');
                indicator.id = 'byDateLoadingIndicator';
                indicator.className = 'lazy-load-indicator';
                indicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Load more (${totalSongs} songs total)...`;
                indicator.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary); cursor: pointer;';
                indicator.onclick = loadMoreSongsByDate;
                container.appendChild(indicator);
            } else if (byDateData.length > 0) {
                const indicator = document.createElement('div');
                indicator.id = 'byDateLoadingIndicator';
                indicator.className = 'lazy-load-indicator';
                indicator.innerHTML = `<i class="fas fa-check"></i> Showing all ${totalSongs} songs`;
                indicator.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary);';
                container.appendChild(indicator);
            }
        }

        // ============ Scroll Detection ============
        function setupLazyLoadScroll(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.addEventListener('scroll', function() {
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;
                
                // Load more when within 100px of bottom
                if (scrollHeight - scrollTop - clientHeight < 100) {
                    if (containerId === 'allSongsList' && allSongsHasMore) {
                        loadMoreAllSongs();
                    } else if (containerId === 'songsList' && byDateHasMore) {
                        loadMoreSongsByDate();
                    }
                }
            });
        }

        // Setup scroll listeners when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            setupLazyLoadScroll('allSongsList');
            setupLazyLoadScroll('songsList');
        });
        
        // Reusable searchable dropdown functions (shared with random-pick.js)
        let songTypeList = [];
        
        /**
         * Load song types from localStorage and song data
         */
        function loadSongTypesForFilter() {
            // Get custom song types from localStorage
            const customSongTypes = JSON.parse(localStorage.getItem('customSongTypes')) || [];
            
            // Get song types from actual song data in localStorage
            const songs = getSongData();
            const typeSet = new Set();
            Object.values(songs).forEach(song => {
                if (song.songType) {
                    typeSet.add(song.songType);
                }
            });
            
            // Combine custom types and song data types (no defaults)
            songTypeList = [...new Set([...customSongTypes, ...typeSet])].sort();
        }
        
        /**
         * Setup searchable dropdown functionality
         */
        function setupSearchableDropdown(inputId, dropdownId, itemList) {
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(dropdownId);
            
            if (!input || !dropdown) return;
            
            // Show dropdown on focus
            input.addEventListener('focus', function() {
                filterDropdownItems(input.value, dropdown, itemList, inputId);
                dropdown.classList.add('show');
            });
            
            // Filter on input
            input.addEventListener('input', function() {
                filterDropdownItems(input.value, dropdown, itemList, inputId);
            });
            
            // Close dropdown on outside click
            document.addEventListener('click', function(e) {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
        
        /**
         * Filter dropdown items based on search query
         */
        function filterDropdownItems(query, dropdown, items, inputId) {
            dropdown.innerHTML = '';
            const filtered = items.filter(item => 
                item.toLowerCase().includes(query.toLowerCase())
            );
            
            // Add "All" option at the top
            const allItem = document.createElement('div');
            allItem.className = 'dropdown-item';
            allItem.textContent = '-- All --';
            allItem.addEventListener('click', function() {
                document.getElementById(inputId).value = '';
                dropdown.classList.remove('show');
                // Trigger reload of data
                if (inputId === 'songTypeFilter') {
                    allSongsLoaded = false;
                    initAllSongsLazyLoad();
                }
            });
            dropdown.appendChild(allItem);
            
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item;
                div.addEventListener('click', function() {
                    document.getElementById(inputId).value = item;
                    dropdown.classList.remove('show');
                    // Trigger reload of data
                    if (inputId === 'songTypeFilter') {
                        allSongsLoaded = false;
                        initAllSongsLazyLoad();
                    }
                });
                dropdown.appendChild(div);
            });
        }
        
        function loadDashboardData() {
            const stats = getStats();
            document.getElementById('uniqueSongs').textContent = stats.uniqueSongs;
            document.getElementById('totalPlays').textContent = stats.totalEntries;
            document.getElementById('uniqueSingers').textContent = stats.uniqueSingers;
            
            // Load top songs
            const songs = Object.values(getSongData());
            songs.sort((a, b) => b.count - a.count);
            
            const topSongsList = document.getElementById('topSongsList');
            if (songs.length > 0) {
                topSongsList.innerHTML = songs.slice(0, 10).map((song, index) => `
                    <div class="list-item${index < 3 ? ' top-ranked' : ''}">
                        <div class="list-item-rank${index < 3 ? ' rank-' + (index + 1) : ''}">
                            ${index < 3 ? '<i class="fas fa-crown"></i>' : '<span>' + (index + 1) + '</span>'}
                        </div>
                        <div class="list-item-icon">
                            <i class="fas fa-music"></i>
                        </div>
                        <div class="list-item-info">
                            <div class="list-item-name">${song.name}${song.nameEnglish ? ` (${song.nameEnglish})` : ''}</div>
                            <div class="list-item-meta">
                                <span><i class="fas fa-microphone"></i> ${song.singer || 'Unknown'}</span>
                            </div>
                        </div>
                        <div class="list-item-count">${song.count}</div>
                    </div>
                `).join('');
            }
            
            // Load top singers
            const singerCounts = {};
            songs.forEach(song => {
                if (song.singer) {
                    singerCounts[song.singer] = (singerCounts[song.singer] || 0) + song.count;
                }
            });
            
            const sortedSingers = Object.entries(singerCounts).sort((a, b) => b[1] - a[1]);
            const topSingersList = document.getElementById('topSingersList');
            
            if (sortedSingers.length > 0) {
                topSingersList.innerHTML = sortedSingers.slice(0, 10).map(([singer, count], index) => `
                    <div class="list-item${index < 3 ? ' top-ranked' : ''}">
                        <div class="list-item-rank${index < 3 ? ' rank-' + (index + 1) : ''}">
                            ${index < 3 ? '<i class="fas fa-crown"></i>' : '<span>' + (index + 1) + '</span>'}
                        </div>
                        <div class="list-item-icon">
                            <i class="fas fa-microphone"></i>
                        </div>
                        <div class="list-item-info">
                            <div class="list-item-name">${singer}</div>
                        </div>
                        <div class="list-item-count">${count}</div>
                    </div>
                `).join('');
            }
            
            // Load recent activity
            const recentSongs = songs.flatMap(song => 
                song.entries.slice(-3).map(entry => ({...entry, name: song.name, singer: song.singer}))
            ).sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate)).slice(0, 10);
            
            const recentActivity = document.getElementById('recentActivity');
            if (recentSongs.length > 0) {
                recentActivity.innerHTML = recentSongs.map(song => `
                    <div class="list-item">
                        <div class="list-item-icon">
                            <i class="fas fa-music"></i>
                        </div>
                        <div class="list-item-info">
                            <div class="list-item-name">${song.name}</div>
                            <div class="list-item-meta">
                                <span><i class="fas fa-microphone"></i> ${song.singer || 'Unknown'}</span>
                                <span><i class="fas fa-calendar"></i> ${song.date}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Bulk import functions
        let previewSongs = [];
        
        document.getElementById('bulkInput').addEventListener('input', updateBulkCount);
        
        function updateBulkCount() {
            const text = document.getElementById('bulkInput').value.trim();
            if (text) {
                const songs = parseSongsFromText(text);
                document.getElementById('bulkCount').textContent = songs.length;
            } else {
                document.getElementById('bulkCount').textContent = '0';
            }
        }
        
        function parseSongsFromText(text, dateOverride = null) {
            const lines = text.split(/\n/).map(s => s.trim()).filter(s => s);
            const songs = [];
            const importDate = dateOverride || document.getElementById('bulkDate').value || getTodayString();
            
            // Pattern 1: Start ~ End Seq| SongName(English) | Singer(English) | Date | SongType
            // Example: 00:06:33 ~ 00:10:19 01| しらないうた(Shiranaiuta) | 苺咲べりぃ(Maisaki Berry)
            // The sequence number (01) is ignored, English names are optional
            const patternWithSeq = /^(\d{2}:\d{2}:\d{2})\s*~\s*(\d{2}:\d{2}:\d{2})\s*\d+\s*\|\s*(.+?)(?:\(([^)]+)\))?\s*\|\s*(.+?)(?:\(([^)]+)\))?\s*(?:\|(\d{4}-\d{2}-\d{2}))?(?:\s*\|(.*))?$/u;
            
            // Pattern 2: Start ~ End | SongName(English) | Singer(English) | Date | SongType (without sequence)
            const patternNoSeq = /^(\d{2}:\d{2}:\d{2})\s*~\s*(\d{2}:\d{2}:\d{2})\s*\|\s*(.+?)(?:\(([^)]+)\))?\s*\|\s*(.+?)(?:\(([^)]+)\))?\s*(?:\|(\d{4}-\d{2}-\d{2}))?(?:\s*\|(.*))?$/u;
            
            lines.forEach(line => {
                console.log('Processing line:', line);
                
                // Try pattern with sequence number first
                let match = line.match(patternWithSeq);
                console.log('Pattern with seq match:', match);
                
                if (!match) {
                    // Try pattern without sequence number
                    match = line.match(patternNoSeq);
                    console.log('Pattern no seq match:', match);
                }
                
                if (match) {
                    const startTime = match[1].trim();
                    const endTime = match[2].trim();
                    const songName = match[3].trim();
                    const songNameEnglish = match[4] ? match[4].trim() : '';
                    const singer = match[5].trim();
                    const singerEnglish = match[6] ? match[6].trim() : '';
                    const date = match[7] ? match[7].trim() : importDate;
                    const songType = match[8] ? match[8].trim() : '';
                    
                    const duration = `${startTime} ~ ${endTime}`;
                    
                    console.log('Parsed:', { songName, songNameEnglish, singer, singerEnglish, duration });
                    
                    if (songName) {
                        songs.push({ 
                            name: songName, 
                            nameEnglish: songNameEnglish,
                            singer: singer, 
                            singerEnglish: singerEnglish,
                            songType: songType,
                            duration: duration,
                            startTime: startTime,
                            endTime: endTime,
                            date: date,
                            sequence: 0
                        });
                    }
                } else {
                    console.log('No match for line:', line);
                }
            });
            
            return songs;
        }
        
        function addBulkSongs() {
            const text = document.getElementById('bulkInput').value.trim();
            const bulkDate = document.getElementById('bulkDate').value || getTodayString();
            
            if (!text) {
                alert(translations[currentLang]?.['Please enter some songs to import'] || 'Please enter some songs to import');
                return;
            }

            previewSongs = parseSongsFromText(text, bulkDate);
            
            if (previewSongs.length > 0) {
                showPreviewModal(previewSongs);
            } else {
                alert(translations[currentLang]?.['No valid songs found to import'] || 'No valid songs found to import');
            }
        }
        
        function showPreviewModal(songs) {
            const modal = document.getElementById('previewModal');
            const listContainer = document.getElementById('previewModalList');
            document.getElementById('previewModalCount').textContent = songs.length;
            
            listContainer.innerHTML = songs.map((song, index) => `
                <div class="list-item">
                    <div class="list-item-sequence">#${song.sequence || '-'}</div>
                    <div class="list-item-icon">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="list-item-info">
                        <div class="list-item-name">${song.name}${song.nameEnglish ? ` (${song.nameEnglish})` : ''}${song.songType ? ` <span class="song-type-badge">${song.songType}</span>` : ''}</div>
                        <div class="list-item-meta">
                            <span><i class="fas fa-microphone"></i> ${song.singer || 'Unknown'}${song.singerEnglish ? ` (${song.singerEnglish})` : ''}</span>
                            ${song.duration ? `<span><i class="fas fa-clock"></i> ${song.duration}</span>` : ''}
                            <span><i class="fas fa-calendar"></i> ${song.date}</span>
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="delete" onclick="removePreviewSong(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            modal.classList.add('active');
        }
        
        function removePreviewSong(index) {
            previewSongs.splice(index, 1);
            showPreviewModal(previewSongs);
            document.getElementById('previewModalCount').textContent = previewSongs.length;
        }
        
        function confirmImport() {
            if (previewSongs.length === 0) {
                alert(translations[currentLang]?.['No songs to import'] || 'No songs to import');
                return;
            }
            
            const songs = getSongData();
            let addedCount = 0;
            
            previewSongs.forEach(song => {
                const key = `${song.name.toLowerCase()}_${song.singer.toLowerCase()}`;
                const sequence = (song.sequence && song.sequence > 0) ? song.sequence : getNextSequence(song.date);
                
                if (songs[key]) {
                    songs[key].count++;
                    songs[key].entries.push({
                        id: Date.now() + Math.random(),
                        name: song.name,
                        nameEnglish: song.nameEnglish || '',
                        singer: song.singer,
                        singerEnglish: song.singerEnglish || '',
                        songType: song.songType || '',
                        duration: song.duration,
                        startTime: song.startTime,
                        endTime: song.endTime,
                        date: song.date,
                        sequence: sequence,
                        addedDate: new Date().toISOString()
                    });
                    if (song.date && !songs[key].dates.includes(song.date)) {
                        songs[key].dates.push(song.date);
                    }
                    if (song.duration && !songs[key].duration) {
                        songs[key].duration = song.duration;
                    }
                    if (song.nameEnglish && !songs[key].nameEnglish) {
                        songs[key].nameEnglish = song.nameEnglish;
                    }
                    if (song.singerEnglish && !songs[key].singerEnglish) {
                        songs[key].singerEnglish = song.singerEnglish;
                    }
                    if (song.songType && !songs[key].songType) {
                        songs[key].songType = song.songType;
                    }
                } else {
                    songs[key] = {
                        id: Date.now() + Math.random(),
                        name: song.name,
                        nameEnglish: song.nameEnglish || '',
                        singer: song.singer,
                        singerEnglish: song.singerEnglish || '',
                        songType: song.songType || '',
                        duration: song.duration,
                        startTime: song.startTime,
                        endTime: song.endTime,
                        date: song.date,
                        dates: song.date ? [song.date] : [],
                        count: 1,
                        entries: [{
                            id: Date.now(),
                            name: song.name,
                            nameEnglish: song.nameEnglish || '',
                            singer: song.singer,
                            singerEnglish: song.singerEnglish || '',
                            songType: song.songType || '',
                            duration: song.duration,
                            startTime: song.startTime,
                            endTime: song.endTime,
                            date: song.date,
                            sequence: sequence,
                            addedDate: new Date().toISOString()
                        }]
                    };
                }
                addedCount++;
            });
            
            saveSongData(songs);
            previewSongs = [];
            closePreviewModal();
            document.getElementById('bulkInput').value = '';
            updateBulkCount();
            alert(`${translations[currentLang]?.['Successfully imported'] || 'Successfully imported'} ${addedCount} ${translations[currentLang]?.['songs!'] || 'songs!'}`);
            
            // Refresh data
            loadDashboardData();
            allSongsLoaded = false;
            byDateLoaded = false;
            initAllSongsLazyLoad();
            initSongsByDateLazyLoad();
        }
        
        function cancelImport() {
            previewSongs = [];
            closePreviewModal();
        }
        
        function closePreviewModal() {
            document.getElementById('previewModal').classList.remove('active');
        }
        
        // Single song add
        function addSingleSong(event) {
            event.preventDefault();
            
            const name = document.getElementById('songName').value.trim();
            const nameEnglish = document.getElementById('songNameEnglish').value.trim();
            const singer = document.getElementById('songSinger').value.trim();
            const singerEnglish = document.getElementById('songSingerEnglish').value.trim();
            const songType = document.getElementById('songType').value;
            const startTime = document.getElementById('songStartTime').value.trim();
            const endTime = document.getElementById('songEndTime').value.trim();
            const date = document.getElementById('importDate').value;

            let duration = '';
            if (startTime && endTime) {
                duration = `${startTime} ~ ${endTime}`;
            } else if (startTime) {
                duration = startTime;
            }

            if (!name) {
                alert(translations[currentLang]?.['Please enter a song name'] || 'Please enter a song name');
                return;
            }

            const finalSequence = getNextSequence(date);

            const songs = getSongData();
            const key = `${name.toLowerCase()}_${singer.toLowerCase()}`;
            
            if (songs[key]) {
                songs[key].count++;
                songs[key].entries.push({
                    id: Date.now() + Math.random(),
                    name: name,
                    nameEnglish: nameEnglish,
                    singer: singer,
                    singerEnglish: singerEnglish,
                    songType: songType,
                    duration: duration,
                    startTime: startTime,
                    endTime: endTime,
                    date: date,
                    sequence: finalSequence,
                    addedDate: new Date().toISOString()
                });
                if (date && !songs[key].dates.includes(date)) {
                    songs[key].dates.push(date);
                }
                if (duration && !songs[key].duration) {
                    songs[key].duration = duration;
                }
                if (nameEnglish && !songs[key].nameEnglish) {
                    songs[key].nameEnglish = nameEnglish;
                }
                if (singerEnglish && !songs[key].singerEnglish) {
                    songs[key].singerEnglish = singerEnglish;
                }
                if (songType && !songs[key].songType) {
                    songs[key].songType = songType;
                }
            } else {
                songs[key] = {
                    id: Date.now(),
                    name: name,
                    nameEnglish: nameEnglish,
                    singer: singer,
                    singerEnglish: singerEnglish,
                    songType: songType,
                    duration: duration,
                    startTime: startTime,
                    endTime: endTime,
                    date: date,
                    dates: date ? [date] : [],
                    count: 1,
                    entries: [{
                        id: Date.now(),
                        name: name,
                        nameEnglish: nameEnglish,
                        singer: singer,
                        singerEnglish: singerEnglish,
                        songType: songType,
                        duration: duration,
                        startTime: startTime,
                        endTime: endTime,
                        date: date,
                        sequence: finalSequence,
                        addedDate: new Date().toISOString()
                    }]
                };
            }

            saveSongData(songs);
            
            // Reset form
            document.getElementById('songName').value = '';
            document.getElementById('songNameEnglish').value = '';
            document.getElementById('songSinger').value = '';
            document.getElementById('songSingerEnglish').value = '';
            document.getElementById('songType').value = '';
            document.getElementById('songStartTime').value = '';
            document.getElementById('songEndTime').value = '';
            document.getElementById('songSequence').value = '';

            alert(translations[currentLang]?.['Song added successfully!'] || 'Song added successfully!');
            
            // Refresh data
            loadDashboardData();
            allSongsLoaded = false;
            byDateLoaded = false;
            initAllSongsLazyLoad();
            initSongsByDateLazyLoad();
        }
        
        function getNextSequence(date) {
            const sequences = JSON.parse(localStorage.getItem('songSequences')) || {};
            if (!sequences[date]) {
                sequences[date] = 0;
            }
            sequences[date]++;
            localStorage.setItem('songSequences', JSON.stringify(sequences));
            return sequences[date];
        }
        
        // File import
        function importFromFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            const fileName = file.name.toLowerCase();
            const fileDate = document.getElementById('fileDate').value || getTodayString();
            
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                importExcelFileForPreview(file, fileDate);
            } else {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    previewSongs = parseSongsFromText(text, fileDate);
                    
                    if (previewSongs.length > 0) {
                        showPreviewModal(previewSongs);
                    } else {
                        alert(translations[currentLang]?.['No valid songs found in the file'] || 'No valid songs found in the file');
                    }
                };
                reader.readAsText(file, 'UTF-8');
            }

            event.target.value = '';
        }
        
        function importExcelFileForPreview(file, fileDate) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    previewSongs = [];
                    const importDate = fileDate || getTodayString();
                    
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;
                        
                        const name = String(row[0] || '').trim();
                        if (!name) continue;
                        
                        const nameEnglish = String(row[1] || '').trim();
                        const singer = String(row[2] || '').trim();
                        const singerEnglish = String(row[3] || '').trim();
                        const songType = String(row[4] || '').trim();
                        const startTime = String(row[5] || '').trim();
                        const endTime = String(row[6] || '').trim();
                        const date = String(row[7] || '').trim() || importDate;
                        
                        const duration = startTime && endTime ? `${startTime} ~ ${endTime}` : (startTime || '');
                        
                        previewSongs.push({ 
                            name, 
                            nameEnglish,
                            singer, 
                            singerEnglish,
                            songType,
                            duration,
                            startTime,
                            endTime,
                            date,
                            sequence: 0
                        });
                    }
                    
                    if (previewSongs.length > 0) {
                        showPreviewModal(previewSongs);
                    } else {
                        alert(translations[currentLang]?.['No valid songs found in the Excel file'] || 'No valid songs found in the Excel file');
                    }
                } catch (error) {
                    console.error('Error reading Excel file:', error);
                    alert(translations[currentLang]?.['Error reading Excel file. Please make sure the file format is correct.'] || 'Error reading Excel file. Please make sure the file format is correct.');
                }
            };
            reader.readAsArrayBuffer(file);
        }
        
        // Download template
        function downloadTemplate() {
            // Template matching Add Single Song fields (Sequence is auto-assigned by import date)
            const templateData = [
                ['Song Name (Japanese) *', 'Song Name (English)', 'Singer (Japanese)', 'Singer (English)', 'Song Type', 'Start Time', 'End Time', 'Date'],
                ['君色シグナル', 'Kimiiro Signal', '春奈るな', 'Haruna Runna', 'Opening', '01:22:41', '01:27:21', '2024-01-15'],
                ['青いベンチ', 'Aoi Bench', 'Soprano', 'Soprano', 'Ending', '01:27:22', '01:31:45', '2024-01-15'],
                ['テスト曲', 'Test Song', 'テスト歌手', 'Test Singer', 'Cover', '01:31:46', '01:35:30', '2024-01-15']
            ];

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(templateData);
            XLSX.utils.book_append_sheet(wb, ws, 'Song Template');

            // Download file
            XLSX.writeFile(wb, 'song_template.xlsx');
        }
        
        // Modal close on outside click
        document.getElementById('previewModal').addEventListener('click', function(e) {
            if (e.target === this) {
                cancelImport();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closePreviewModal();
            }
        });
        
        // Load data on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboardData();
            // Apply language to dynamic content
            if (typeof applyLanguage === 'function') {
                applyLanguage();
            }
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('importDate').value = today;
            document.getElementById('bulkDate').value = today;
            document.getElementById('fileDate').value = today;
            
            // Setup searchable song type dropdown (for adding new songs)
            setupSongTypeDropdown();
            
            // Setup song type filter dropdown (for filtering songs)
            loadSongTypesForFilter();
            setupSearchableDropdown('songTypeFilter', 'songTypeFilterDropdown', songTypeList);
        });
        
        // Default song types
        const defaultSongTypes = ['Opening', 'Ending', 'Insert Song', 'Cover', 'Original', 'Live', 'Other'];
        
        /**
         * Get all song types from localStorage songData + custom (no defaults)
         */
        function getSongTypes() {
            // Get custom song types from localStorage
            const stored = JSON.parse(localStorage.getItem('customSongTypes')) || [];
            
            // Get song types from actual song data in localStorage
            const songs = getSongData();
            const songTypeSet = new Set();
            Object.values(songs).forEach(song => {
                if (song.songType) {
                    songTypeSet.add(song.songType);
                }
            });
            
            return [...new Set([...stored, ...songTypeSet])].sort();
        }
        
        /**
         * Save custom song type to localStorage
         */
        function saveCustomSongType(type) {
            if (!type.trim()) return;
            const stored = JSON.parse(localStorage.getItem('customSongTypes')) || [];
            if (!stored.includes(type)) {
                stored.push(type);
                localStorage.setItem('customSongTypes', JSON.stringify(stored));
            }
        }
        
        /**
         * Setup searchable dropdown for song type
         */
        function setupSongTypeDropdown() {
            const input = document.getElementById('songType');
            const dropdown = document.getElementById('songTypeDropdown');
            
            // Show dropdown on focus
            input.addEventListener('focus', function() {
                filterSongTypeDropdown(input.value, dropdown);
                dropdown.classList.add('show');
            });
            
            // Filter on input
            input.addEventListener('input', function() {
                filterSongTypeDropdown(input.value, dropdown);
            });
            
            // Close dropdown on outside click
            document.addEventListener('click', function(e) {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
        
        /**
         * Filter and display song type dropdown items
         */
        function filterSongTypeDropdown(query, dropdown) {
            dropdown.innerHTML = '';
            const types = getSongTypes();
            const filtered = types.filter(type => 
                type.toLowerCase().includes(query.toLowerCase())
            );
            
            // Check if query matches any existing type
            const exactMatch = types.some(t => t.toLowerCase() === query.toLowerCase());
            
            // Add option to add new type if query doesn't match exactly
            if (query.trim() && !exactMatch) {
                const newItem = document.createElement('div');
                newItem.className = 'dropdown-item dropdown-item-new';
                newItem.innerHTML = `<i class="fas fa-plus"></i> Add "${query}"`;
                newItem.addEventListener('click', function() {
                    saveCustomSongType(query);
                    document.getElementById('songType').value = query;
                    dropdown.classList.remove('show');
                });
                dropdown.appendChild(newItem);
            }
            
            // Add "Clear" option
            const clearItem = document.createElement('div');
            clearItem.className = 'dropdown-item';
            clearItem.textContent = '-- Clear --';
            clearItem.addEventListener('click', function() {
                document.getElementById('songType').value = '';
                dropdown.classList.remove('show');
            });
            dropdown.appendChild(clearItem);
            
            filtered.forEach(type => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = type;
                div.addEventListener('click', function() {
                    document.getElementById('songType').value = type;
                    dropdown.classList.remove('show');
                });
                dropdown.appendChild(div);
            });
        }
    