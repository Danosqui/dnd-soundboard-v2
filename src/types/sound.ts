export interface SoundCategory {
  id: string;
  name: string;
  icon: string;
  color: string; // e.g. 'purple', 'emerald', 'amber', 'rose', 'blue', 'cyan', 'indigo'
  order: number;
  createdAt: number;
}

export interface SoundItem {
  id: string;
  title: string;
  categoryId: string;
  fileUrl: string;
  storagePath: string;
  duration?: number; // duration in seconds
  loop: boolean; // infinitely repeating loop
  stopCategoryOthers: boolean; // stop other sounds in same category when played
  icon: string;
  volume: number; // 0.0 to 1.0 (default 1.0)
  order: number;
  createdAt: number;
}

export interface SoundPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface AppSettings {
  masterPin?: string;
  masterVolume: number;
  normalizeAudio: boolean;
  theme: 'dark' | 'dnd-amber' | 'dnd-crimson';
}
