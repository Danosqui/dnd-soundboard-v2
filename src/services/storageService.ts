import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { SoundItem, SoundCategory, AppSettings } from '../types/sound';
import { getFirebaseInstances } from './firebase';
import { localDb, DEFAULT_CATEGORIES } from './localDb';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

const SETTINGS_KEY = 'dnd_soundboard_settings';

export const storageService = {
  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading settings', e);
    }
    return {
      masterVolume: 1.0,
      normalizeAudio: true,
      theme: 'dark',
    };
  },

  saveSettings(settings: AppSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  // Category subscriptions
  subscribeCategories(callback: (categories: SoundCategory[]) => void): () => void {
    const { db, isConfigured } = getFirebaseInstances();

    if (isConfigured && db) {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // If Firestore categories collection is empty, seed with defaults!
          DEFAULT_CATEGORIES.forEach(cat => {
            setDoc(doc(db, 'categories', cat.id), cat);
          });
          callback(DEFAULT_CATEGORIES);
        } else {
          const list: SoundCategory[] = [];
          snapshot.forEach(docSnap => list.push(docSnap.data() as SoundCategory));
          callback(list);
        }
      }, (error) => {
        console.error('Firestore categories snapshot error, falling back to localDb:', error);
        localDb.getCategories().then(callback);
      });
      return unsubscribe;
    } else {
      // Local fallback
      localDb.getCategories().then(callback);
      // Return a no-op unsubscribe or custom event
      const interval = setInterval(() => {
        localDb.getCategories().then(callback);
      }, 5000);
      return () => clearInterval(interval);
    }
  },

  // Sound subscriptions
  subscribeSounds(callback: (sounds: SoundItem[]) => void): () => void {
    const { db, isConfigured } = getFirebaseInstances();

    if (isConfigured && db) {
      const q = query(collection(db, 'sounds'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: SoundItem[] = [];
        snapshot.forEach(docSnap => list.push(docSnap.data() as SoundItem));
        callback(list);
      }, (error) => {
        console.error('Firestore sounds snapshot error, falling back to localDb:', error);
        localDb.getSounds().then(callback);
      });
      return unsubscribe;
    } else {
      localDb.getSounds().then(callback);
      const interval = setInterval(() => {
        localDb.getSounds().then(callback);
      }, 5000);
      return () => clearInterval(interval);
    }
  },

  // Upload an audio file (bulk or single)
  async uploadAudioFile(
    file: File, 
    soundData: Partial<SoundItem>, 
    onProgress?: UploadProgressCallback
  ): Promise<SoundItem> {
    const { db, storage, isConfigured } = getFirebaseInstances();
    const soundId = soundData.id || `sound_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let downloadUrl = '';
    let storagePath = '';

    if (isConfigured && storage && db) {
      // Clean filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      storagePath = `sounds/${soundId}/${safeName}`;
      const fileRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve();
          }
        );
      });

      const newSound: SoundItem = {
        id: soundId,
        title: soundData.title || file.name.replace(/\.[^/.]+$/, ''),
        categoryId: soundData.categoryId || 'cat-combat',
        fileUrl: downloadUrl,
        storagePath: storagePath,
        loop: soundData.loop ?? false,
        stopCategoryOthers: soundData.stopCategoryOthers ?? true,
        icon: soundData.icon || 'Volume2',
        volume: soundData.volume ?? 1.0,
        order: soundData.order ?? Date.now(),
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'sounds', soundId), newSound);
      return newSound;
    } else {
      // Local IndexedDB fallback
      if (onProgress) onProgress(30);
      await localDb.saveBlob(soundId, file);
      if (onProgress) onProgress(80);
      const objectUrl = URL.createObjectURL(file);
      storagePath = `local://${soundId}`;

      const newSound: SoundItem = {
        id: soundId,
        title: soundData.title || file.name.replace(/\.[^/.]+$/, ''),
        categoryId: soundData.categoryId || 'cat-combat',
        fileUrl: objectUrl,
        storagePath: storagePath,
        loop: soundData.loop ?? false,
        stopCategoryOthers: soundData.stopCategoryOthers ?? true,
        icon: soundData.icon || 'Volume2',
        volume: soundData.volume ?? 1.0,
        order: soundData.order ?? Date.now(),
        createdAt: Date.now(),
      };

      await localDb.saveSound(newSound);
      if (onProgress) onProgress(100);
      return newSound;
    }
  },

  // Save or update sound metadata
  async saveSound(sound: SoundItem): Promise<void> {
    const { db, isConfigured } = getFirebaseInstances();
    if (isConfigured && db) {
      await setDoc(doc(db, 'sounds', sound.id), sound);
    } else {
      await localDb.saveSound(sound);
    }
  },

  // Delete sound
  async deleteSound(sound: SoundItem): Promise<void> {
    const { db, storage, isConfigured } = getFirebaseInstances();
    if (isConfigured && db && storage) {
      try {
        if (sound.storagePath && !sound.storagePath.startsWith('local://')) {
          const fileRef = ref(storage, sound.storagePath);
          await deleteObject(fileRef).catch(() => {});
        }
      } catch (err) {
        console.warn('Could not delete storage file:', err);
      }
      await deleteDoc(doc(db, 'sounds', sound.id));
    } else {
      if (sound.storagePath && sound.storagePath.startsWith('local://')) {
        const blobId = sound.storagePath.replace('local://', '');
        await localDb.deleteBlob(blobId);
      }
      await localDb.deleteSound(sound.id);
    }
  },

  // Save or update category
  async saveCategory(category: SoundCategory): Promise<void> {
    const { db, isConfigured } = getFirebaseInstances();
    if (isConfigured && db) {
      await setDoc(doc(db, 'categories', category.id), category);
    } else {
      await localDb.saveCategory(category);
    }
  },

  // Delete category
  async deleteCategory(categoryId: string): Promise<void> {
    const { db, isConfigured } = getFirebaseInstances();
    if (isConfigured && db) {
      await deleteDoc(doc(db, 'categories', categoryId));
    } else {
      await localDb.deleteCategory(categoryId);
    }
  },
};
