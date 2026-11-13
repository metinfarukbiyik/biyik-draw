/**
 * Çizim sahnesini ve kütüphaneyi tarayıcıda (IndexedDB) saklar. Görseller de sahneyle
 * birlikte durur; localStorage'ın ~5 MB sınırına takılmamak için IndexedDB kullanılır.
 * Hiçbir veri sunucuya gönderilmez.
 */
const DB_NAME = 'biyik-draw';
const STORE = 'kv';
let dbPromise = null;
function open() {
    dbPromise ?? (dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
    return dbPromise;
}
export async function getItem(key) {
    try {
        const db = await open();
        return await new Promise((resolve, reject) => {
            const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }
    catch {
        return null;
    }
}
export async function setItem(key, value) {
    try {
        const db = await open();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    catch {
        /* gizli pencere ya da kota: çizim bu oturumla sınırlı kalır */
    }
}
