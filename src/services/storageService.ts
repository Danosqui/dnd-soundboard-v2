import { SoundItem, SoundCategory, AppSettings } from '../types/sound';
import { getSupabaseInstances } from './supabase';
import { localDb, DEFAULT_CATEGORIES } from './localDb';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

const SETTINGS_KEY = 'dnd_soundboard_settings';

// Helper to convert DB row to SoundItem
function mapSoundRowToItem(row: any): SoundItem {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id || row.categoryId,
    fileUrl: row.file_url || row.fileUrl,
    storagePath: row.storage_path || row.storagePath,
    duration: row.duration || 0,
    loop: !!row.loop,
    stopCategoryOthers: row.stop_category_others ?? row.stopCategoryOthers ?? true,
    icon: row.icon || 'Volume2',
    volume: row.volume ?? 1.0,
    order: row.order ?? 0,
    createdAt: row.created_at || row.createdAt || Date.now(),
  };
}

// Helper to convert SoundItem to DB row
function mapSoundItemToRow(item: SoundItem) {
  return {
    id: item.id,
    title: item.title,
    category_id: item.categoryId,
    file_url: item.fileUrl,
    storage_path: item.storagePath,
    duration: item.duration || 0,
    loop: item.loop,
    stop_category_others: item.stopCategoryOthers,
    icon: item.icon,
    volume: item.volume ?? 1.0,
    order: item.order ?? 0,
    created_at: item.createdAt || Date.now(),
  };
}

// Helper to convert DB row to SoundCategory
function mapCategoryRowToItem(row: any): SoundCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'FolderPlus',
    color: row.color || 'purple',
    order: row.order ?? 0,
    createdAt: row.created_at || row.createdAt || Date.now(),
  };
}

function mapCategoryItemToRow(cat: SoundCategory) {
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    order: cat.order,
    created_at: cat.createdAt,
  };
}

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
    const { client, isConfigured } = getSupabaseInstances();

    if (isConfigured && client) {
      const fetchCategories = async () => {
        try {
          const { data, error } = await client
            .from('categories')
            .select('*')
            .order('order', { ascending: true });

          if (error) throw error;

          if (!data || data.length === 0) {
            // Seed defaults into Supabase
            const rows = DEFAULT_CATEGORIES.map(mapCategoryItemToRow);
            await client.from('categories').upsert(rows);
            callback(DEFAULT_CATEGORIES);
          } else {
            callback(data.map(mapCategoryRowToItem));
          }
        } catch (err) {
          console.error('Supabase categories fetch failed, falling back to localDb:', err);
          localDb.getCategories().then(callback);
        }
      };

      fetchCategories();

      // Realtime subscription
      const channel = client
        .channel('categories_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => {
            fetchCategories();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Local fallback with immediate fetch + event-based subscription
      localDb.getCategories().then(callback);
      return localDb.subscribeCategories(() => {
        localDb.getCategories().then(callback);
      });
    }
  },

  // Sound subscriptions
  subscribeSounds(callback: (sounds: SoundItem[]) => void): () => void {
    const { client, isConfigured } = getSupabaseInstances();

    if (isConfigured && client) {
      const fetchSounds = async () => {
        try {
          const { data, error } = await client
            .from('sounds')
            .select('*')
            .order('order', { ascending: true });

          if (error) throw error;
          callback((data || []).map(mapSoundRowToItem));
        } catch (err) {
          console.error('Supabase sounds fetch failed, falling back to localDb:', err);
          localDb.getSounds().then(callback);
        }
      };

      fetchSounds();

      // Realtime subscription
      const channel = client
        .channel('sounds_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sounds' },
          () => {
            fetchSounds();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Local fallback with immediate fetch + event-based subscription
      localDb.getSounds().then(callback);
      return localDb.subscribeSounds(() => {
        localDb.getSounds().then(callback);
      });
    }
  },

  // Upload an audio file (bulk or single)
  async uploadAudioFile(
    file: File, 
    soundData: Partial<SoundItem>, 
    onProgress?: UploadProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<SoundItem> {
    const { client, isConfigured } = getSupabaseInstances();
    const soundId = soundData.id || `sound_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (isConfigured && client) {
      if (onProgress) onProgress(10);

      // Clean file name
      const fileExt = file.name.split('.').pop() || 'mp3';
      const safeName = `${soundId}.${fileExt}`;
      const storagePath = `audio/${safeName}`;

      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Upload file to Supabase Storage bucket 'sounds'
      if (onProgress) onProgress(30);
      const { data: uploadData, error: uploadError } = await client.storage
        .from('sounds')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(`Storage upload error: ${uploadError.message}. (Did you create the 'sounds' bucket in Supabase?)`);
      }

      if (onProgress) onProgress(75);

      // Get public URL
      const { data: urlData } = client.storage
        .from('sounds')
        .getPublicUrl(storagePath);

      const downloadUrl = urlData.publicUrl;

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

      // Save row to public.sounds table
      if (onProgress) onProgress(90);
      const { error: dbError } = await client
        .from('sounds')
        .upsert([mapSoundItemToRow(newSound)]);

      if (dbError) {
        console.error('Supabase DB error saving sound:', dbError);
        throw new Error(`Database error: ${dbError.message}. (Did you create the 'sounds' table in Supabase?)`);
      }

      if (onProgress) onProgress(100);
      return newSound;
    } else {
      // Local IndexedDB Mode
      if (onProgress) onProgress(25);
      
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      await localDb.saveBlob(soundId, file);
      if (onProgress) onProgress(65);

      const objectUrl = URL.createObjectURL(file);
      const storagePath = `local://${soundId}`;

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
    const { client, isConfigured } = getSupabaseInstances();
    if (isConfigured && client) {
      await client.from('sounds').upsert([mapSoundItemToRow(sound)]);
    } else {
      await localDb.saveSound(sound);
    }
  },

  // Delete sound
  async deleteSound(sound: SoundItem): Promise<void> {
    const { client, isConfigured } = getSupabaseInstances();
    if (isConfigured && client) {
      try {
        if (sound.storagePath && !sound.storagePath.startsWith('local://')) {
          await client.storage.from('sounds').remove([sound.storagePath]);
        }
      } catch (err) {
        console.warn('Could not delete storage file from Supabase:', err);
      }
      await client.from('sounds').delete().eq('id', sound.id);
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
    const { client, isConfigured } = getSupabaseInstances();
    if (isConfigured && client) {
      await client.from('categories').upsert([mapCategoryItemToRow(category)]);
    } else {
      await localDb.saveCategory(category);
    }
  },

  // Delete category
  async deleteCategory(categoryId: string): Promise<void> {
    const { client, isConfigured } = getSupabaseInstances();
    if (isConfigured && client) {
      await client.from('categories').delete().eq('id', categoryId);
    } else {
      await localDb.deleteCategory(categoryId);
    }
  },
};
