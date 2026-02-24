
        let channelSettings = null;
        
        // Default video - can be changed in settings
        const DEFAULT_VIDEO_ID = 'BZDhUZIq844';
        const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=' + DEFAULT_VIDEO_ID;
        
        function loadSettings() {
            channelSettings = JSON.parse(localStorage.getItem('youtubeChannelSettings')) || null;
            
            // Use default video if no settings configured
            if (!channelSettings || (!channelSettings.channelUrl && !channelSettings.previewUrl)) {
                channelSettings = {
                    previewUrl: DEFAULT_VIDEO_URL,
                    channelName: '苺咲べりぃ / Maisaki Berry',
                    channelUrl: 'https://www.youtube.com/channel/UC7A7bGRVdIwo93nA3x-OQ'
                };
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
        
        function extractChannelId(url) {
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
        
        function renderContent() {
            const container = document.getElementById('streamContent');
            
            if (!channelSettings || (!channelSettings.channelUrl && !channelSettings.previewUrl)) {
                container.innerHTML = `
                    <div class="setup-prompt">
                        <i class="fas fa-cog"></i>
                        <h2>Channel Not Configured</h2>
                        <p>Please set up your YouTube channel URL in Settings first.</p>
                        <a href="settings.html">
                            <i class="fas fa-cog"></i> Go to Settings
                        </a>
                    </div>
                `;
                return;
            }
            
            // Try to extract channel ID from URL if not set
            if (!channelSettings.channelId && channelSettings.channelUrl) {
                channelSettings.channelId = extractChannelId(channelSettings.channelUrl);
            }
            
            // If preview URL is set, show it
            if (channelSettings.previewUrl) {
                const videoId = extractVideoId(channelSettings.previewUrl);
                if (videoId) {
                    const channelName = channelSettings.channelName || 'YouTube Channel';
                    const channelUrl = channelSettings.channelUrl || '#';
                    container.innerHTML = `
                        <div class="channel-info">
                            <div class="channel-avatar">
                                <i class="fab fa-youtube"></i>
                            </div>
                            <a href="${channelUrl}" target="_blank" class="channel-details">
                                <h1>${channelName}</h1>
                            </a>
                        </div>

                        <div class="video-grid" style="grid-template-columns: 1fr;">
                            <a href="${channelSettings.previewUrl}" target="_blank" class="video-card">
                                <div class="video-card-thumbnail">
                                    <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" alt="Preview Video">
                                    <div class="video-card-play" style="opacity: 1; width: 80px; height: 80px; font-size: 32px;">
                                        <i class="fas fa-play"></i>
                                    </div>
                                </div>
                            </a>
                        </div>
                    `;
                    return;
                }
            }
            
            // If no preview URL but channel ID exists, load latest video
            if (channelSettings.channelId) {
                loadLatestVideo(channelSettings, container);
                return;
            }
            
            const channelName = channelSettings.channelName || 'YouTube Channel';
            const channelUrl = channelSettings.channelUrl || '#';
            
            container.innerHTML = `
                <div class="channel-info">
                    <div class="channel-avatar">
                        <i class="fab fa-youtube"></i>
                    </div>
                    <a href="${channelUrl}" target="_blank" class="channel-details">
                        <h1>${channelName}</h1>
                    </a>
                </div>

                <div class="video-grid" id="videoGrid">
                    <div class="loading">
                        <i class="fas fa-spinner"></i>
                    </div>
                </div>
            `;
            
            loadVideos();
        }
        
        async function loadLatestVideo(channelSettings, container) {
            const channelId = channelSettings.channelId;
            const channelName = channelSettings.channelName || 'YouTube Channel';
            
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner"></i>
                </div>
            `;
            
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            
            try {
                const response = await fetch(proxyUrl + encodeURIComponent(RSS_URL));
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                
                const entry = xml.querySelector('entry');
                
                if (entry) {
                    const videoId = entry.querySelector('videoId')?.textContent || '';
                    const title = entry.querySelector('title')?.textContent || 'Latest Video';
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    const channelUrl = channelSettings.channelUrl || '#';
                    container.innerHTML = `
                        <div class="channel-info">
                            <div class="channel-avatar">
                                <i class="fab fa-youtube"></i>
                            </div>
                            <a href="${channelUrl}" target="_blank" class="channel-details">
                                <h1>${channelName}</h1>
                            </a>
                        </div>

                        <div class="video-grid" style="grid-template-columns: 1fr;">
                            <a href="${videoUrl}" target="_blank" class="video-card">
                                <div class="video-card-thumbnail">
                                    <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" alt="${title}">
                                    <div class="video-card-play" style="opacity: 1; width: 80px; height: 80px; font-size: 32px;">
                                        <i class="fas fa-play"></i>
                                    </div>
                                </div>
                            </a>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading latest video:', error);
            }
        }
        
        async function loadVideos() {
            if (!channelSettings || !channelSettings.channelId) return;
            
            const container = document.getElementById('videoGrid');
            const channelId = channelSettings.channelId;
            
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            
            try {
                const response = await fetch(proxyUrl + encodeURIComponent(RSS_URL));
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                
                const entries = xml.querySelectorAll('entry');
                
                if (entries.length > 0) {
                    displayVideos(entries, container);
                }
            } catch (error) {
                console.error('Error loading videos:', error);
            }
        }
        
        function displayVideos(entries, container) {
            const videos = Array.from(entries).slice(0, 6).map(entry => {
                const videoId = entry.querySelector('videoId')?.textContent || '';
                const title = entry.querySelector('title')?.textContent || 'Untitled';
                const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                const published = new Date(entry.querySelector('published')?.textContent || '').toLocaleDateString();
                
                return { videoId, title, thumbnail, published };
            });
            
            container.innerHTML = videos.map(v => `
                <a href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" class="video-card">
                    <div class="video-card-thumbnail">
                        <img src="${v.thumbnail}" alt="${v.title}">
                        <div class="video-card-play">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="video-card-info">
                        <div class="video-card-title">${v.title}</div>
                        <div class="video-card-meta">${v.published}</div>
                    </div>
                </a>
            `).join('');
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            renderContent();
        });
    