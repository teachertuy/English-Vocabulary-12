import { VocabularyWord } from '../types';

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

export const getVocabImageFromCache = (word: string): string | null => {
    if (!word || typeof window === 'undefined') return null;
    try {
        const key = CACHE_PREFIX + word.trim().toLowerCase();
        const cached = localStorage.getItem(key);
        if (cached && !isUnreliableImage(cached)) {
            return cached;
        }
    } catch (e) {
        console.error("Failed to read image from cache:", e);
    }
    return null;
};

export const setVocabImageToCache = (word: string, imageUrl: string): void => {
    if (!word || !imageUrl || typeof window === 'undefined') return;
    try {
        if (!isUnreliableImage(imageUrl)) {
            const key = CACHE_PREFIX + word.trim().toLowerCase();
            localStorage.setItem(key, imageUrl);
        }
    } catch (e) {
        console.error("Failed to save image to cache:", e);
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
