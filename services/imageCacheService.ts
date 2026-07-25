import { VocabularyWord } from '../types';

const DB_NAME = 'VocabImageCacheDB';
const STORE_NAME = 'images';
const CACHE_PREFIX = 'vocab_img_';

export const isUnreliableImage = (imageUrl?: string | null): boolean => {
    if (!imageUrl || typeof imageUrl !== 'string') return true;
    const trimmed = imageUrl.trim();
    if (!trimmed) return true;
    if (trimmed.includes('pollinations.ai')) return true;
    if (trimmed.includes('illustration_white_background')) return true;
    if (trimmed.includes('via.placeholder.com')) return true;
    return false;
};

// In-memory cache for fast synchronous access
const memoryCache = new Map<string, string>();


// Initialize IndexedDB and load items into memory cache
let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
        return Promise.resolve(null);
    }
    if (!dbPromise) {
        dbPromise = new Promise((resolve) => {
            try {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = () => {
                    const db = request.result;
                    try {
                        const tx = db.transaction(STORE_NAME, 'readonly');
                        const store = tx.objectStore(STORE_NAME);
                        const getAllReq = store.openCursor();
                        getAllReq.onsuccess = (e: any) => {
                            const cursor = e.target?.result;
                            if (cursor) {
                                if (typeof cursor.key === 'string' && typeof cursor.value === 'string') {
                                    memoryCache.set(cursor.key, cursor.value);
                                }
                                cursor.continue();
                            }
                        };
                    } catch (err) {
                        // ignore
                    }
                    resolve(db);
                };
                request.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }
    return dbPromise;
}

// Trigger DB init on load
if (typeof window !== 'undefined') {
    getDB();
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                const word = key.replace(CACHE_PREFIX, '');
                const val = localStorage.getItem(key);
                if (val && !isUnreliableImage(val)) {
                    memoryCache.set(word, val);
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

export const getVocabImageFromCache = (word: string): string | null => {
    if (!word || typeof window === 'undefined') return null;
    const key = word.trim().toLowerCase();
    
    // 1. Check memory cache first
    if (memoryCache.has(key)) {
        const val = memoryCache.get(key);
        if (val && !isUnreliableImage(val)) return val;
    }

    // 2. Fallback check localStorage
    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        if (cached && !isUnreliableImage(cached)) {
            memoryCache.set(key, cached);
            return cached;
        }
    } catch (e) {
        // ignore
    }
    return null;
};

export const setVocabImageToCache = (word: string, imageUrl: string): void => {
    if (!word || !imageUrl || typeof window === 'undefined') return;
    if (isUnreliableImage(imageUrl)) return;

    const key = word.trim().toLowerCase();
    memoryCache.set(key, imageUrl);

    // Save to IndexedDB (asynchronously, persistent, high capacity)
    getDB().then(db => {
        if (!db) return;
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(imageUrl, key);
        } catch (err) {
            // ignore
        }
    });

    // Safely handle localStorage: only store short URLs to avoid exceeding 5MB quota
    try {
        const storageKey = CACHE_PREFIX + key;
        if (imageUrl.length < 2000) {
            localStorage.setItem(storageKey, imageUrl);
        }
    } catch (e) {
        // Quota exceeded: clean up old cached image entries from localStorage
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(CACHE_PREFIX)) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (cleanupErr) {
            // ignore
        }
    }
};

export const resolveVocabImages = (vocabList: VocabularyWord[] | null | undefined): VocabularyWord[] => {
    if (!vocabList || !Array.isArray(vocabList)) return [];
    
    return vocabList.map(item => {
        if (!item || !item.word) return item;
        
        // 1. If item already has a reliable image, cache it
        if (!isUnreliableImage(item.image)) {
            setVocabImageToCache(item.word, item.image);
            return item;
        }
        
        // 2. Otherwise try to resolve from cache
        const cachedImage = getVocabImageFromCache(item.word);
        if (cachedImage) {
            return { ...item, image: cachedImage };
        }
        
        return item;
    });
};

