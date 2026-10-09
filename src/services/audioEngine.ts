import { SoundItem, SoundPlaybackState } from '../types/sound';

interface TrackInstance {
  audio: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  sound: SoundItem;
}

type PlaybackListener = (states: Record<string, SoundPlaybackState>) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracksBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private compressorGain: GainNode | null = null;
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

      // Master Gain (connected to speaker destination)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Common Track Bus (all sound channels plug into this single bus)
      this.tracksBus = this.ctx.createGain();
      this.tracksBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Path A: Dynamics Compressor (for audio normalization & limiter)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.compressorGain = this.ctx.createGain();
      this.compressorGain.gain.setValueAtTime(this.isNormalizationEnabled ? 1.0 : 0.0, this.ctx.currentTime);

      // Wire Path A: tracksBus -> compressor -> compressorGain -> masterGain
      this.tracksBus.connect(this.compressor);
      this.compressor.connect(this.compressorGain);
      this.compressorGain.connect(this.masterGain);

      // Path B: Pure Bypass (raw original sound level, no compression)
      this.bypassGain = this.ctx.createGain();
      this.bypassGain.gain.setValueAtTime(this.isNormalizationEnabled ? 0.0 : 1.0, this.ctx.currentTime);

      // Wire Path B: tracksBus -> bypassGain -> masterGain
      this.tracksBus.connect(this.bypassGain);
      this.bypassGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  private updateNormalizationRouting() {
    if (!this.compressorGain || !this.bypassGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    if (this.isNormalizationEnabled) {
      // Normalization ON: use compressor, silence bypass
      this.compressorGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.bypassGain.gain.setTargetAtTime(0.0, now, 0.02);
    } else {
      // Normalization OFF: raw sound level, silence compressor
      this.compressorGain.gain.setTargetAtTime(0.0, now, 0.02);
      this.bypassGain.gain.setTargetAtTime(1.0, now, 0.02);
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

    // Clicking a currently playing sound stops it
    if (this.isPlaying(sound.id)) {
      this.stop(sound.id);
      return;
    }

    // If configured to stop other sounds in the same category
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

      // Connect track gain into the common tracksBus
      sourceNode.connect(gainNode).connect(this.tracksBus!);

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
