/**
 * Simple utility for switching between normal and active favicons
 */

const FAVICON_NORMAL = 'favicon.ico';
const FAVICON_ACTIVE = 'favicon-active.ico';

function resolveFaviconUrl(fileName: string) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return '/' + fileName;
    }

    const currentHref =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href') ?? '/favicon.ico';
    const currentUrl = new URL(currentHref, window.location.origin);
    const basePath = currentUrl.pathname.replace(/[^/]+$/, '');

    return `${basePath}${fileName}`;
}

/**
 * Updates the favicon in the document
 */
function setFavicon(fileName: string) {
    if (typeof document === 'undefined') return;
    
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/x-icon';
        document.head.appendChild(link);
    }
    
    // Force reload by adding timestamp
    link.href = resolveFaviconUrl(fileName) + '?t=' + Date.now();
}

/**
 * Updates the favicon to show a notification indicator
 */
export function updateFaviconWithNotification() {
    setFavicon(FAVICON_ACTIVE);
}

/**
 * Resets the favicon to its original state
 */
export function resetFavicon() {
    setFavicon(FAVICON_NORMAL);
}
