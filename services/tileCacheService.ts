
const DB_NAME = 'HydroFlowTileCache';
const STORE_NAME = 'tiles';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Abre ou recupera a instância do banco de dados IndexedDB
 */
function getDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

/**
 * Recupera um tile do cache local
 */
export async function getTileFromCache(url: string): Promise<Blob | null> {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(url);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

/**
 * Salva um tile no cache local
 */
export async function saveTileToCache(url: string, blob: Blob): Promise<void> {
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(blob, url);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch (e) {
        // Ignora erros de escrita no cache (ex: disco cheio)
    }
}
