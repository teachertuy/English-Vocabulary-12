
import { saveImageToLocal } from './imageStorageService';

// Suffix để ép AI ra chất 2D minh họa giáo dục
const AI_STYLE_SUFFIX = "minimal flat design, vector style, clean white background, 2d illustration, vibrant colors, high quality, centered, no text";

/**
 * Tạo URL Pollinations.ai dựa trên từ vựng
 */
export const getPollinationsURL = (word: string, translation: string) => {
    const prompt = encodeURIComponent(`${word} (${translation}), ${AI_STYLE_SUFFIX}`);
    return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
};

/**
 * Tải ảnh từ URL và lưu vào IndexedDB
 * Cập nhật: Ném lỗi để Dashboard có thể bắt lỗi 429
 */
export const fetchAndCacheImage = async (word: string, translation: string): Promise<string | null> => {
    const url = getPollinationsURL(word, translation);
    try {
        const response = await fetch(url);
        
        if (response.status === 429) {
            throw new Error("RATE_LIMIT");
        }
        
        if (!response.ok) {
            throw new Error(`HTTP_ERROR_${response.status}`);
        }
        
        const blob = await response.blob();
        if (blob.type.includes('image')) {
            await saveImageToLocal(word, blob);
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (error) {
        console.error(`Error caching image for ${word}:`, error);
        throw error;
    }
};
