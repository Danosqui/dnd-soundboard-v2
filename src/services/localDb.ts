import { SoundCategory, SoundItem } from '../types/sound';

const DB_NAME = 'dnd_soundboard_v2_db';
const DB_VERSION = 2; // Incremented to version 2 to ensure clean schema upgrade
const STORE_SOUNDS = 'sounds';
const STORE_BLOBS = 'audio_blobs';
const STORE_CATEGORIES = 'categories';

export const DEFAULT_CATEGORIES: SoundCategory[] = [
  { id: 'cat-ambience', name: 'Ambience', icon: 'CloudRain', color: 'emerald', order: 0, createdAt: 1000 },
  { id: 'cat-music', name: 'Music', icon: 'Music', color: 'purple', order: 1, createdAt: 1001 },
  { id: 'cat-combat', name: 'Combat SFX', icon: 'Sword', color: 'crimson', order: 2, createdAt: 1002 },
  { id: 'cat-spells', name: 'Spells & Magic', icon: 'Sparkles', color: 'cyan', order: 3, createdAt: 1003 },
  { id: 'cat-tavern', name: 'Tavern & Social', icon: 'Beer', color: 'amber', order: 4, createdAt: 1004 },
];

type ChangeListener = () => void;
const soundListeners: Set<ChangeListener> = new Set();
const categoryListeners: Set<ChangeListener> = new Set();

let dbInstance: IDBDatabase | null = null;
let dbOpeningPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpeningPromise) return dbOpeningPromise;

  dbOpeningPromise = new Promise((resolve, reject) => {
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
        const catStore = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        // Seed default categories directly inside the versionchange transaction!
        DEFAULT_CATEGORIES.forEach(c => catStore.put(c));
      } else {
        // Version 2 upgrade: ensure categories are seeded
        const tx = (e.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const catStore = tx.objectStore(STORE_CATEGORIES);
          DEFAULT_CATEGORIES.forEach(c => catStore.put(c));
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbOpeningPromise = null;

      dbInstance.onclose = () => {
        dbInstance = null;
      };
      dbInstance.onerror = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      dbOpeningPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another tab.');
    };
  });

  return dbOpeningPromise;
}

export const localDb = {
  // Listeners for instant UI updates without aggressive polling
  subscribeSounds(fn: ChangeListener): () => void {
    soundListeners.add(fn);
    return () => soundListeners.delete(fn);
  },

  subscribeCategories(fn: ChangeListener): () => void {
    categoryListeners.add(fn);
    return () => categoryListeners.delete(fn);
  },

  notifySounds() {
    soundListeners.forEach(fn => fn());
  },

  notifyCategories() {
    categoryListeners.forEach(fn => fn());
  },

  async saveBlob(id: string, blob: Blob): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_BLOBS, 'readwrite');
        const store = tx.objectStore(STORE_BLOBS);
        store.put(blob, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Failed to save audio blob'));
        tx.onabort = () => reject(new Error('Transaction aborted'));
      } catch (err) {
        // Fallback: convert to ArrayBuffer if Blob structured cloning is not supported
        blob.arrayBuffer().then(buffer => {
          const tx = db.transaction(STORE_BLOBS, 'readwrite');
          const store = tx.objectStore(STORE_BLOBS);
          store.put({ buffer, type: blob.type }, id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }).catch(reject);
      }
    });
  },

  async getBlob(id: string): Promise<Blob | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_BLOBS, 'readonly');
        const store = tx.objectStore(STORE_BLOBS);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result;
          if (!res) {
            resolve(null);
          } else if (res instanceof Blob) {
            resolve(res);
          } else if (res.buffer && res.type) {
            resolve(new Blob([res.buffer], { type: res.type }));
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async deleteBlob(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_BLOBS, 'readwrite');
        const store = tx.objectStore(STORE_BLOBS);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async getSounds(): Promise<SoundItem[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SOUNDS, 'readonly');
        const store = tx.objectStore(STORE_SOUNDS);
        const req = store.getAll();
        req.onsuccess = async () => {
          const items: SoundItem[] = req.result || [];
          // Revive blob object URLs for local sounds
          for (const item of items) {
            if (item.storagePath && item.storagePath.startsWith('local://')) {
              const blobId = item.storagePath.replace('local://', '');
              try {
                const blob = await localDb.getBlob(blobId);
                if (blob) {
                  item.fileUrl = URL.createObjectURL(blob);
                }
              } catch (e) {
                console.warn('Could not revive blob for sound', item.title, e);
              }
            }
          }
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async saveSound(sound: SoundItem): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SOUNDS, 'readwrite');
        const store = tx.objectStore(STORE_SOUNDS);
        store.put(sound);
        tx.oncomplete = () => {
          localDb.notifySounds();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async deleteSound(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SOUNDS, 'readwrite');
        const store = tx.objectStore(STORE_SOUNDS);
        store.delete(id);
        tx.oncomplete = () => {
          localDb.notifySounds();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async getCategories(): Promise<SoundCategory[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_CATEGORIES, 'readonly');
        const store = tx.objectStore(STORE_CATEGORIES);
        const req = store.getAll();
        req.onsuccess = () => {
          let cats: SoundCategory[] = req.result || [];
          if (cats.length === 0) {
            cats = [...DEFAULT_CATEGORIES];
            // Seed asynchronously outside this transaction so no deadlock occurs
            setTimeout(() => {
              getDB().then(database => {
                const writeTx = database.transaction(STORE_CATEGORIES, 'readwrite');
                const writeStore = writeTx.objectStore(STORE_CATEGORIES);
                DEFAULT_CATEGORIES.forEach(c => writeStore.put(c));
              }).catch(() => {});
            }, 100);
          }
          resolve(cats);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async saveCategory(category: SoundCategory): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
        const store = tx.objectStore(STORE_CATEGORIES);
        store.put(category);
        tx.oncomplete = () => {
          localDb.notifyCategories();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
        const store = tx.objectStore(STORE_CATEGORIES);
        store.delete(id);
        tx.oncomplete = () => {
          localDb.notifyCategories();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  },
};
