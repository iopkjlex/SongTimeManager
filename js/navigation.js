/**
 * Shared Navigation Component
 * This script dynamically generates the navigation menu for all pages
 */

function generateNavigation(activePage) {
    const navItems = [
        { href: 'songs-summary.html', icon: 'fa-list', textEn: 'Song Summary', textJa: '曲まとめ' },
        { href: 'random-pick.html', icon: 'fa-dice', textEn: 'Random Pick', textJa: 'ランダムピック' },
        { href: 'storage.html', icon: 'fa-hdd', textEn: 'Storage', textJa: 'ストレージ' },
        { href: 'settings.html', icon: 'fa-cog', textEn: 'Settings', textJa: '設定' }
    ];
    
    let navHtml = `
        <ul class="nav-menu">
            ${navItems.map(item => `
                <li>
                    <a href="${item.href}" class="${activePage === item.href ? 'active' : ''}">
                        <i class="fas ${item.icon}"></i> 
                        <span class="nav-text" data-en="${item.textEn}" data-ja="${item.textJa}">${item.textEn}</span>
                    </a>
                </li>
            `).join('')}
            <li>
                <a href="#" class="lang-toggle" onclick="toggleLanguage(); return false;" aria-label="Toggle language">
                    <i class="fas fa-language" aria-hidden="true"></i> 
                    <span class="nav-text" id="langLabel">EN</span>
                </a>
            </li>
        </ul>
    `;
    
    return navHtml;
}

/**
 * Initialize navigation on page load
 * Call this function in each HTML file's nav container
 */
function initNavigation(activePage) {
    const navContainer = document.querySelector('.nav-menu');
    if (navContainer) {
        navContainer.innerHTML = generateNavigation(activePage);
        
        // Apply language after navigation is generated
        if (typeof applyLanguage === 'function') {
            applyLanguage();
        }
    }
}

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Will be called by individual page scripts
    });
}
