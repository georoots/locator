// GeoRoots Locator - Service Worker
// Version 2.6.4 - Resume interrupted walk-around recordings

const CACHE_NAME = 'georoots-locator-v2.6.4';
const STATIC_CACHE_NAME = 'georoots-locator-static-v2.6.4';

// Files to cache for offline use (app shell)
// Note: Leaflet CSS/JS now inlined in HTML, no external dependencies
const STATIC_FILES = [
    './',
    './index.html',
    './polygon-geometry.js',
    './translations-es.js',
    './translations-pt.js',
    './translations-sw.js',
    './translations-cs.js'
];

// Install event - cache static files with validation (but don't activate yet)
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        validateAndCacheFiles()
            .then(() => checkForceUpdate())
            .then((shouldForceUpdate) => {
                if (shouldForceUpdate) {
                    console.warn('🚨 FORCE UPDATE detected - activating immediately');
                    return self.skipWaiting();
                } else {
                    console.log('Service Worker: App shell validated and cached, waiting for user to update');
                    // Don't call skipWaiting() - let user control when to update
                }
            })
            .catch(error => {
                console.error('Service Worker: CRITICAL - Failed to cache app shell:', error);
                // This will prevent SW from installing, keeping old version safe
                throw error;
            })
    );
});

// Check backend for force update directive
async function checkForceUpdate() {
    try {
        const response = await fetch('./force-update.json?_=' + Date.now());
        if (!response.ok) {
            return false;
        }
        
        const config = await response.json();
        console.log('Force update config:', config);
        
        return config.forceUpdate === true;
    } catch (error) {
        console.log('Could not check force-update.json:', error.message);
        return false; // Fail safely - no force update
    }
}

// Validate and cache files - prevents corrupted HTML from being cached
async function validateAndCacheFiles() {
    const cache = await caches.open(STATIC_CACHE_NAME);
    
    // Fetch and validate each file
    for (const url of STATIC_FILES) {
        console.log('Service Worker: Fetching and validating:', url);
        
        try {
            // Bypass the HTTP cache so a new SW version never bakes in stale app files
            const response = await fetch(url, { cache: 'reload' });
            
            // Check response is OK
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            }
            
            // For HTML files, validate content
            if (url.includes('index.html') || url.endsWith('.html') || url === './') {
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('text/html')) {
                    throw new Error(`Invalid content-type for HTML: ${contentType}`);
                }
                
                // Clone response to read content without consuming it
                const textContent = await response.clone().text();
                
                // Basic HTML validation
                if (!textContent || textContent.length < 1000) {
                    throw new Error('HTML file too small or empty - likely corrupted');
                }
                
                if (!textContent.includes('<!DOCTYPE') && !textContent.includes('<!doctype')) {
                    throw new Error('HTML missing DOCTYPE - likely corrupted');
                }
                
                if (!textContent.includes('</html>') && !textContent.includes('</HTML>')) {
                    throw new Error('HTML missing closing tag - likely corrupted or incomplete');
                }
                
                if (!textContent.includes('Leaflet')) {
                    throw new Error('HTML missing Leaflet code - corrupted or wrong file');
                }
                
                console.log('Service Worker: HTML validation passed:', url);
            }
            
            // If all validations pass, cache the response
            await cache.put(url, response);
            console.log('Service Worker: Successfully cached:', url);
            
        } catch (error) {
            console.error('Service Worker: Validation failed for', url, error);
            throw error; // Fail install to prevent broken version from being cached
        }
    }
    
    console.log('Service Worker: All files validated and cached successfully');
}

/*
 * AGGRESSIVE CACHE CLEANUP
 * 
 * On activation, we delete ALL old versions of our caches (both main and static).
 * This ensures that stale HTML, CSS, or JS doesn't persist across updates.
 * 
 * Combined with network-first for index.html, this guarantees users get fresh content
 * after a service worker update, which is critical for deploying bug fixes and layout changes.
 * 
 * Tile caches (for map tiles) are preserved as they don't change with app updates.
 */
// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete ALL old caches (both main and static)
                    if ((cacheName.startsWith('georoots-locator-') && 
                         cacheName !== CACHE_NAME && 
                         cacheName !== STATIC_CACHE_NAME) ||
                        // Also delete old static caches
                        (cacheName.startsWith('georoots-locator-static-') && 
                         cacheName !== STATIC_CACHE_NAME)) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    // Keep tile caches and current caches
                    return Promise.resolve();
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated');
            // Take control of all clients immediately and force reload
            return self.clients.claim();
        })
    );
});

/*
 * FETCH STRATEGY - Cache-First for HTML (Controlled Updates)
 * 
 * Strategy:
 * - Use CACHE-FIRST for index.html to prevent forced updates
 * - Users see update notification but keep using old version
 * - Only after clicking "Update" button does new version load
 * - Leaflet CSS and JS are inlined in HTML (no external dependencies)
 * 
 * Benefits:
 * - Users control when to update
 * - Old version keeps working until user chooses to update
 * - No forced updates or version mismatches
 * - Update button is meaningful and required
 * - Reliable offline functionality
 */
// Fetch event - serve files from cache when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle Web Share Target Level 2: POST with multipart files
    if (request.method === 'POST' && url.pathname.endsWith('/index.html')) {
        event.respondWith(receiveSharedFiles(request));
        return;
    }

    // Handle HTML document requests - CACHE-FIRST to prevent forced updates
    if (isAppShellRequest(request)) {
        event.respondWith(
            // Open THIS SW's cache explicitly (not search all caches)
            caches.open(STATIC_CACHE_NAME)
                .then(cache => cache.match(request))
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('Service Worker: Serving HTML from cache (v' + STATIC_CACHE_NAME + '):', request.url);
                        return cachedResponse;
                    }
                    
                    // Not in cache - fetch from network (first load or cache cleared)
                    console.log('Service Worker: Fetching HTML from network:', request.url);
                    return fetch(request)
                        .then(response => {
                            // Cache the HTML for future use
                            if (response && response.status === 200) {
                                const responseToCache = response.clone();
                                caches.open(STATIC_CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseToCache);
                                        console.log('Service Worker: Cached HTML:', request.url);
                                    });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Network failed - try to find HTML in any cache as last resort
                            console.log('Service Worker: Network failed, searching all caches');
                            return caches.match('./index.html');
                        });
                })
        );
        return;
    }
    
    // Handle tile requests with cache-first strategy
    if (isTileRequest(request)) {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // Return cached tile immediately
                        return cachedResponse;
                    }
                    
                    // If not cached, fetch from network
                    return fetch(request)
                        .then(response => {
                            // Cache successful tile responses for future use
                            if (response && response.status === 200) {
                                const responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseToCache);
                                    });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Return a placeholder or error image for failed tiles
                            return new Response('Tile not available offline', { 
                                status: 503,
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
        return;
    }
    
    // Handle API requests (like WMS)
    if (isAPIRequest(request)) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // If API fails, try to serve from cache
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return new Response('API not available offline', { 
                                status: 503,
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
        return;
    }
    
    // For all other requests, use network-first strategy
    event.respondWith(
        fetch(request)
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Store shared files in Cache Storage for the page to pick up, then redirect to the app.
// Always redirects (even on failure) so the user lands in the app rather than on an error page.
async function receiveSharedFiles(request) {
    try {
        const shareCache = await caches.open('georoots-shared-files');
        await Promise.all((await shareCache.keys()).map(k => shareCache.delete(k)));

        const formData = await request.formData();
        const files = formData.getAll('files').filter(f => f && typeof f.arrayBuffer === 'function');
        // Some apps share GeoJSON content as plain text instead of a file
        const text = String(formData.get('text') || '').trim();
        if (files.length === 0 && text.startsWith('{')) {
            files.push(new File([text], 'shared.geojson', { type: 'application/geo+json' }));
        }

        await Promise.all(files.map((f, idx) => shareCache.put(`/__shared__/file_${idx}`, new Response(f, {
            headers: {
                'Content-Type': f.type || 'application/octet-stream',
                // Header values must be ISO-8859-1, so non-Latin file names have to be encoded
                'X-Filename': encodeURIComponent(f.name || `shared_${idx + 1}.geojson`)
            }
        }))));
    } catch (e) {
        console.error('Service Worker: Failed to receive shared files', e);
    }
    return Response.redirect('./index.html?shared=1', 303);
}

// Helper functions
function isAppShellRequest(request) {
    const url = new URL(request.url);
    // Only handle same-origin HTML documents (Leaflet now inlined)
    return url.origin === self.location.origin && 
           (request.destination === 'document' || 
            url.pathname.endsWith('.html'));
}

function isTileRequest(request) {
    const url = new URL(request.url);
    return request.destination === 'image' && (
        url.hostname.includes('tile') ||
        url.hostname.includes('openstreetmap') ||
        url.hostname.includes('opentopomap') ||
        url.hostname.includes('arcgisonline') ||
        url.hostname.includes('globalforestwatch') ||
        url.pathname.includes('/tile/') ||
        url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg)/)
    );
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.hostname.includes('forest-observatory') ||
           url.searchParams.has('SERVICE') ||
           url.searchParams.has('REQUEST');
}

// Background sync for uploading features when back online
self.addEventListener('sync', event => {
    if (event.tag === 'feature-sync') {
        console.log('Service Worker: Background sync triggered');
        event.waitUntil(syncFeatures());
    }
});

// Handle feature sync
async function syncFeatures() {
    try {
        // Check if we have any pending features to sync
        const pendingData = await self.registration.sync.getTags();
        if (pendingData.includes('feature-upload')) {
            console.log('Service Worker: Syncing features...');
            // Here you could implement feature upload to a server
            // For now, we'll just log that sync was attempted
            console.log('Service Worker: Feature sync completed');
        }
    } catch (error) {
        console.error('Service Worker: Error during feature sync:', error);
    }
}

// Handle app updates
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('Service Worker: Received SKIP_WAITING, activating new version');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupOldCaches());
    }
});

// Clean up old tile caches periodically
async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('georoots-locator-') && 
            name !== CACHE_NAME && 
            name !== STATIC_CACHE_NAME
        );
        
        await Promise.all(
            oldCaches.map(cacheName => {
                console.log('Service Worker: Cleaning up old cache:', cacheName);
                return caches.delete(cacheName);
            })
        );
    } catch (error) {
        console.error('Service Worker: Error during cache cleanup:', error);
    }
}
