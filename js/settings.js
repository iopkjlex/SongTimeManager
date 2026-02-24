
        // Load current settings on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
        });
        
        function loadSettings() {
            const settings = JSON.parse(localStorage.getItem('youtubeChannelSettings')) || {};
            
            // Update channel URL display
            const channelUrlEl = document.getElementById('currentChannelUrl');
            if (settings.channelUrl) {
                channelUrlEl.innerHTML = `Current: <strong>${settings.channelUrl}</strong>`;
                document.getElementById('youtubeChannelUrl').value = settings.channelUrl;
            }
            
            // Update channel name display
            const channelNameEl = document.getElementById('currentChannelName');
            if (settings.channelName) {
                channelNameEl.innerHTML = `Current: <strong>${settings.channelName}</strong>`;
                document.getElementById('channelName').value = settings.channelName;
            }
            
            // Update preview URL display
            const previewUrlEl = document.getElementById('currentPreviewUrl');
            if (settings.previewUrl) {
                previewUrlEl.innerHTML = `Current: <strong>${settings.previewUrl}</strong>`;
                document.getElementById('previewUrl').value = settings.previewUrl;
            }
            
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
                                <div class="preview-card-title">🎬 Featured Preview Video</div>
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
                                <div class="preview-card-title">🎬 Latest: ${title}</div>
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
                        <div class="preview-card-title">🎬 Click to view latest videos on YouTube</div>
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
            
            if (!channelUrl && !previewUrl) {
                alert('Please enter a YouTube channel URL or preview video URL');
                return;
            }
            
            // Extract channel ID from URL
            let channelId = null;
            if (channelUrl) {
                channelId = extractChannelId(channelUrl);
                if (!channelId) {
                    alert('Invalid YouTube channel URL. Please use a URL like: https://www.youtube.com/channel/UC...');
                    return;
                }
            }
            
            const settings = {
                channelUrl: channelUrl,
                channelId: channelId,
                channelName: channelName || 'YouTube Channel',
                previewUrl: previewUrl
            };
            
            localStorage.setItem('youtubeChannelSettings', JSON.stringify(settings));
            
            // Show success message
            const successMsg = document.getElementById('successMessage');
            successMsg.classList.add('show');
            
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);
            
            // Load preview after saving
            loadPreview(channelId, previewUrl);
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
        
        function clearData() {
            if (confirm('Are you sure you want to clear all song data? This cannot be undone.')) {
                localStorage.removeItem('songs');
                localStorage.removeItem('songSequences');
                alert('All data has been cleared.');
            }
        }
    