
const DB_NAME = 'VocabImageDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

/**
 * Khởi tạo cơ sở dữ liệu IndexedDB
 */
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event: any) => reject(event.target.error);
    });
};

/**
 * Lưu trữ ảnh (Blob) vào IndexedDB
 */
export const saveImageToLocal = async (word: string, blob: Blob): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, word.toLowerCase().trim());

        request.onsuccess = () => resolve();
        request.onerror = (event: any) => reject(event.target.error);
    });
};

/**
 * Lấy ảnh từ IndexedDB và trả về URL (Object URL)
 */
export const getLocalImageURL = async (word: string): Promise<string | null> => {
    const db = await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(word.toLowerCase().trim());

        request.onsuccess = (event: any) => {
            const blob = event.target.result;
            if (blob instanceof Blob) {
                resolve(URL.createObjectURL(blob));
            } else {
                resolve(null);
            }
        };
        request.onerror = () => resolve(null);
    });
};

/**
 * Kiểm tra xem từ vựng đã có ảnh trong máy chưa
 */
export const hasLocalImage = async (word: string): Promise<boolean> => {
    const db = await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getKey(word.toLowerCase().trim());
        request.onsuccess = (event: any) => resolve(!!event.target.result);
        request.onerror = () => resolve(false);
    });
};
