import { SoundCategory, SoundItem, AppSettings } from '../types/sound';

const DB_NAME = 'dnd_soundboard_v2_db';
const DB_VERSION = 1;
const STORE_SOUNDS = 'sounds';
const STORE_BLOBS = 'audio_blobs';
const STORE_CATEGORIES = 'categories';

export const DEFAULT_CATEGORIES: SoundCategory[] = [
  { id: 'cat-ambience', name: 'Ambience', icon: 'CloudRain', color: 'emerald', order: 0, createdAt: Date.now() },
  { id: 'cat-music', name: 'Music', icon: 'Music', color: 'purple', order: 1, createdAt: Date.now() },
  { id: 'cat-combat', name: 'Combat SFX', icon: 'Sword', color: 'crimson', order: 2, createdAt: Date.now() },
  { id: 'cat-spells', name: 'Spells & Magic', icon: 'Sparkles', color: 'cyan', order: 3, createdAt: Date.now() },
  { id: 'cat-tavern', name: 'Tavern & Social', icon: 'Beer', color: 'amber', order: 4, createdAt: Date.now() },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SOUNDS)) {
        db.createObjectStore(STORE_SOUNDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const localDb = {
  async saveBlob(id: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      store.put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getBlob(id: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteBlob(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getSounds(): Promise<SoundItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SOUNDS, 'readonly');
      const store = tx.objectStore(STORE_SOUNDS);
      const req = store.getAll();
      req.onsuccess = async () => {
        const items: SoundItem[] = req.result || [];
        // Revive blob URLs for locally stored sounds if needed
        for (const item of items) {
          if (item.storagePath && item.storagePath.startsWith('local://')) {
            const blobId = item.storagePath.replace('local://', '');
            const blob = await localDb.getBlob(blobId);
            if (blob) {
              item.fileUrl = URL.createObjectURL(blob);
            }
          }
        }
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async saveSound(sound: SoundItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SOUNDS, 'readwrite');
      const store = tx.objectStore(STORE_SOUNDS);
      store.put(sound);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteSound(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SOUNDS, 'readwrite');
      const store = tx.objectStore(STORE_SOUNDS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getCategories(): Promise<SoundCategory[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readonly');
      const store = tx.objectStore(STORE_CATEGORIES);
      const req = store.getAll();
      req.onsuccess = async () => {
        let cats: SoundCategory[] = req.result || [];
        if (cats.length === 0) {
          // Initialize default categories
          for (const c of DEFAULT_CATEGORIES) {
            await localDb.saveCategory(c);
          }
          cats = [...DEFAULT_CATEGORIES];
        }
        resolve(cats);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async saveCategory(category: SoundCategory): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORE_CATEGORIES);
      store.put(category);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORE_CATEGORIES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
