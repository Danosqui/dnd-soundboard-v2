import { SoundItem, SoundPlaybackState } from '../types/sound';

interface TrackInstance {
  audio: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  sound: SoundItem;
  onEnded?: () => void;
}

type PlaybackListener = (states: Record<string, SoundPlaybackState>) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bypassGain: GainNode | null = null;
  
  private tracks: Map<string, TrackInstance> = new Map();
  private states: Record<string, SoundPlaybackState> = {};
  private listeners: Set<PlaybackListener> = new Set();
  
  private isNormalizationEnabled: boolean = true;
  private masterVolume: number = 1.0;
  private animationFrameId: number | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Dynamics Compressor (for audio normalization & anti-clipping limiter)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.masterGain);

      // Bypass gain (when normalization is turned off)
      this.bypassGain = this.ctx.createGain();
      this.bypassGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.bypassGain.connect(this.masterGain);

      this.updateNormalizationRouting();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  private updateNormalizationRouting() {
    if (!this.compressor || !this.bypassGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.isNormalizationEnabled) {
      this.compressor.connect(this.masterGain!);
      try {
        this.bypassGain.disconnect();
      } catch {
        // ignore if already disconnected
      }
    } else {
      try {
        this.compressor.disconnect();
      } catch {
        // ignore
      }
      this.bypassGain.connect(this.masterGain!);
    }
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.states);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.states }));
  }

  private startProgressLoop() {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      let hasPlaying = false;
      this.tracks.forEach((track, id) => {
        if (!track.audio.paused && !track.audio.ended) {
          hasPlaying = true;
          this.states[id] = {
            isPlaying: true,
            currentTime: track.audio.currentTime,
            duration: track.audio.duration || track.sound.duration || 0,
          };
        }
      });

      if (hasPlaying) {
        this.notify();
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.animationFrameId = null;
        this.notify();
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public async play(sound: SoundItem, allSoundsInBoard: SoundItem[] = []): Promise<void> {
    const ctx = this.initContext();

    // Check if sound is already playing; if so, clicking it stops it (per requirement: 'when clicking on a playing sound, it must stop playing')
    if (this.isPlaying(sound.id)) {
      this.stop(sound.id);
      return;
    }

    // If this sound has 'stop other sounds in same category when played' enabled:
    if (sound.stopCategoryOthers) {
      this.stopCategory(sound.categoryId, allSoundsInBoard, sound.id);
    }

    let track = this.tracks.get(sound.id);

    if (!track) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.src = sound.fileUrl;
      audio.loop = sound.loop;

      const sourceNode = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(sound.volume ?? 1.0, ctx.currentTime);

      // Connect to compressor or bypass
      if (this.isNormalizationEnabled && this.compressor) {
        sourceNode.connect(gainNode).connect(this.compressor);
      } else if (this.bypassGain) {
        sourceNode.connect(gainNode).connect(this.bypassGain);
      } else if (this.masterGain) {
        sourceNode.connect(gainNode).connect(this.masterGain);
      }

      track = {
        audio,
        sourceNode,
        gainNode,
        sound,
      };

      audio.addEventListener('ended', () => {
        if (!audio.loop) {
          this.states[sound.id] = {
            isPlaying: false,
            currentTime: 0,
            duration: audio.duration || sound.duration || 0,
          };
          this.notify();
        }
      });

      audio.addEventListener('error', (e) => {
        console.error(`Audio error for sound ${sound.title}:`, e);
        this.states[sound.id] = {
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        };
        this.notify();
      });

      this.tracks.set(sound.id, track);
    } else {
      // update properties in case sound config changed
      track.sound = sound;
      track.audio.loop = sound.loop;
      track.gainNode.gain.setValueAtTime(sound.volume ?? 1.0, ctx.currentTime);
      if (track.audio.src !== sound.fileUrl) {
        track.audio.src = sound.fileUrl;
      }
    }

    try {
      track.audio.currentTime = 0;
      await track.audio.play();

      this.states[sound.id] = {
        isPlaying: true,
        currentTime: 0,
        duration: track.audio.duration || sound.duration || 0,
      };
      this.notify();
      this.startProgressLoop();
    } catch (err) {
      console.error('Failed to play sound:', err);
      this.states[sound.id] = {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      };
      this.notify();
    }
  }

  public stop(soundId: string) {
    const track = this.tracks.get(soundId);
    if (track) {
      try {
        track.audio.pause();
        track.audio.currentTime = 0;
      } catch (e) {
        console.warn('Error pausing audio:', e);
      }
    }

    this.states[soundId] = {
      isPlaying: false,
      currentTime: 0,
      duration: track?.audio.duration || track?.sound.duration || 0,
    };
    this.notify();
  }

  public stopCategory(categoryId: string, allSoundsInBoard: SoundItem[], exceptSoundId?: string) {
    // Find all sounds that belong to this category
    const categorySoundIds = new Set(
      allSoundsInBoard
        .filter(s => s.categoryId === categoryId && s.id !== exceptSoundId)
        .map(s => s.id)
    );

    this.tracks.forEach((track, id) => {
      if (categorySoundIds.has(id) || (track.sound.categoryId === categoryId && id !== exceptSoundId)) {
        this.stop(id);
      }
    });
  }

  public stopAll() {
    this.tracks.forEach((track, id) => {
      try {
        track.audio.pause();
        track.audio.currentTime = 0;
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
      this.states[id] = {
        isPlaying: false,
        currentTime: 0,
        duration: track.audio.duration || track.sound.duration || 0,
      };
    });
    this.notify();
  }

  public isPlaying(soundId: string): boolean {
    return !!this.states[soundId]?.isPlaying;
  }

  public getPlayingSoundIds(): string[] {
    return Object.keys(this.states).filter(id => this.states[id]?.isPlaying);
  }

  public setSoundVolume(soundId: string, volume: number) {
    const track = this.tracks.get(soundId);
    if (track && this.ctx) {
      track.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setNormalization(enabled: boolean) {
    this.isNormalizationEnabled = enabled;
    if (this.ctx) {
      this.updateNormalizationRouting();
    }
  }

  public getNormalization(): boolean {
    return this.isNormalizationEnabled;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }
}

export const audioEngine = new AudioEngine();
