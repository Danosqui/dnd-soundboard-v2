import { SoundItem, SoundPlaybackState } from '../types/sound';

interface ActiveTrack {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  sound: SoundItem;
  startedAt: number;
  duration: number;
}

type PlaybackListener = (states: Record<string, SoundPlaybackState>) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private tracksBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private compressorGain: GainNode | null = null;
  private bypassGain: GainNode | null = null;

  // In-memory decoded PCM buffer cache (eliminates mobile network streaming jitter)
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer>> = new Map();
  // Background preloads run one at a time and yield during playback so audio thread is never starved
  private preloadQueue: string[] = [];
  private isPreloading: boolean = false;

  // Active playing sources
  private activeTracks: Map<string, ActiveTrack> = new Map();
  private states: Record<string, SoundPlaybackState> = {};
  private listeners: Set<PlaybackListener> = new Set();

  private isNormalizationEnabled: boolean = true;
  private masterVolume: number = 1.0;
  private progressIntervalId: number | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // 'playback' uses larger audio buffers: avoids underrun glitches on mobile CPUs
      this.ctx = new AudioCtx({ latencyHint: 'playback' });

      // Automatically recover if mobile browser suspends context on route/app switch
      this.ctx.onstatechange = () => {
        if (this.ctx && this.activeTracks.size > 0 && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };

      // 1. Master Output Gain
      // Scaled by 0.85 (-1.4 dBFS) safe ceiling to guarantee zero DAC inter-sample clipping on mobile speakers
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume * 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 2. Master Brickwall Limiter (-1.5 dB ceiling)
      // Clamps summed signals (e.g. multi-track playback) so they never reach 0 dBFS clipping
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-1.5, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.05, this.ctx.currentTime);
      this.masterLimiter.connect(this.masterGain);

      // 3. Sub-bass High-Pass Filter (Speaker Protection Filter)
      // Mobile speakers physically cannot reproduce <80Hz. Unfiltered sub-bass causes excessive cone
      // excursion, triggering hardware SmartAmp protection circuits (cutting audio for 50-100ms).
      // Stripping <80Hz eliminates mobile speaker stutter while keeping full audible punch and warmth.
      this.highPassFilter = this.ctx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(80, this.ctx.currentTime);
      this.highPassFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
      this.highPassFilter.connect(this.masterLimiter);

      // 4. Main Track Bus (all sound sources route into this bus)
      this.tracksBus = this.ctx.createGain();
      this.tracksBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Path A: Dynamics Compressor (smooth leveler)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(16, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.010, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Attenuate by 0.70 (-3.1 dB) to counteract Web Audio DynamicsCompressor's built-in makeup gain
      this.compressorGain = this.ctx.createGain();
      this.compressorGain.gain.setValueAtTime(this.isNormalizationEnabled ? 0.70 : 0.0, this.ctx.currentTime);

      // Wire Path A: tracksBus -> compressor -> compressorGain -> highPassFilter
      this.tracksBus.connect(this.compressor);
      this.compressor.connect(this.compressorGain);
      this.compressorGain.connect(this.highPassFilter);

      // Path B: Pure Bypass (raw sound level, no compression)
      this.bypassGain = this.ctx.createGain();
      this.bypassGain.gain.setValueAtTime(this.isNormalizationEnabled ? 0.0 : 1.0, this.ctx.currentTime);

      // Wire Path B: tracksBus -> bypassGain -> highPassFilter
      this.tracksBus.connect(this.bypassGain);
      this.bypassGain.connect(this.highPassFilter);
    }

    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private updateNormalizationRouting() {
    if (!this.compressorGain || !this.bypassGain || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.isNormalizationEnabled) {
      this.compressorGain.gain.setTargetAtTime(0.70, now, 0.02);
      this.bypassGain.gain.setTargetAtTime(0.0, now, 0.02);
    } else {
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

  /**
   * Preload and decode audio into in-memory AudioBuffer.
   * Completely bypasses mobile network streaming hiccups.
   */
  public async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    const pending = this.pendingFetches.get(url);
    if (pending) return pending;

    const ctx = this.initContext();

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(url, audioBuffer);
        return audioBuffer;
      } finally {
        this.pendingFetches.delete(url);
      }
    })();

    this.pendingFetches.set(url, fetchPromise);
    return fetchPromise;
  }

  /**
   * Preload a list of sounds in the background for zero-latency mobile playback.
   */
  public preloadSounds(sounds: SoundItem[]) {
    sounds.forEach(s => {
      if (s.fileUrl && !this.bufferCache.has(s.fileUrl) && !this.preloadQueue.includes(s.fileUrl)) {
        this.preloadQueue.push(s.fileUrl);
      }
    });
    this.drainPreloadQueue();
  }

  private async drainPreloadQueue() {
    if (this.isPreloading) return;
    this.isPreloading = true;
    try {
      while (this.preloadQueue.length > 0) {
        // If audio is actively playing, pause preloading so CPU audio decoding doesn't starve the audio thread
        if (this.activeTracks.size > 0) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const url = this.preloadQueue.shift();
        if (!url || this.bufferCache.has(url)) continue;

        await this.loadAudioBuffer(url).catch(() => {});
        // Yield gently between audio decodes so main thread and UI remain completely responsive
        await new Promise(r => setTimeout(r, 250));
      }
    } finally {
      this.isPreloading = false;
    }
  }

  private startProgressLoop() {
    if (this.progressIntervalId !== null) return;

    this.progressIntervalId = window.setInterval(() => {
      if (!this.ctx || this.activeTracks.size === 0) {
        if (this.progressIntervalId !== null) {
          clearInterval(this.progressIntervalId);
          this.progressIntervalId = null;
        }
        this.notify();
        return;
      }

      const now = this.ctx.currentTime;
      this.activeTracks.forEach((track, id) => {
        const elapsed = now - track.startedAt;
        const current = track.sound.loop
          ? (elapsed % track.duration)
          : Math.min(track.duration, elapsed);

        this.states[id] = {
          isPlaying: true,
          currentTime: current,
          duration: track.duration,
        };
      });

      this.notify();
    }, 500);
  }

  public async play(sound: SoundItem, allSoundsInBoard: SoundItem[] = []): Promise<void> {
    const ctx = this.initContext();

    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    // Tapping a currently playing sound stops it
    if (this.isPlaying(sound.id)) {
      this.stop(sound.id);
      return;
    }

    // Stop other sounds in the same category if configured
    if (sound.stopCategoryOthers) {
      this.stopCategory(sound.categoryId, allSoundsInBoard, sound.id);
    }

    try {
      // Decode audio into PCM memory buffer (zero streaming dropouts on mobile)
      const audioBuffer = await this.loadAudioBuffer(sound.fileUrl);

      // Double-check if user stopped it while fetching
      if (this.isPlaying(sound.id)) {
        return;
      }

      // Create one-shot AudioBufferSourceNode
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = sound.loop;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(sound.volume ?? 1.0, ctx.currentTime);

      // Connect: source -> gainNode -> tracksBus
      source.connect(gainNode).connect(this.tracksBus!);

      const duration = audioBuffer.duration;
      const startedAt = ctx.currentTime;

      source.onended = () => {
        if (!sound.loop) {
          this.handleTrackEnded(sound.id);
        }
      };

      source.start(ctx.currentTime);

      this.activeTracks.set(sound.id, {
        source,
        gainNode,
        sound,
        startedAt,
        duration,
      });

      this.states[sound.id] = {
        isPlaying: true,
        currentTime: 0,
        duration,
      };

      this.notify();
      this.startProgressLoop();
    } catch (err) {
      console.error(`Failed to play sound '${sound.title}':`, err);
      this.states[sound.id] = {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      };
      this.notify();
    }
  }

  private handleTrackEnded(soundId: string) {
    const track = this.activeTracks.get(soundId);
    if (track) {
      try {
        track.source.disconnect();
        track.gainNode.disconnect();
      } catch {}
      this.activeTracks.delete(soundId);
    }

    this.states[soundId] = {
      isPlaying: false,
      currentTime: 0,
      duration: track?.duration || 0,
    };
    this.notify();
  }

  public stop(soundId: string) {
    const track = this.activeTracks.get(soundId);
    if (track) {
      try {
        track.source.onended = null;
        track.source.stop(0);
        track.source.disconnect();
        track.gainNode.disconnect();
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
      this.activeTracks.delete(soundId);
    }

    this.states[soundId] = {
      isPlaying: false,
      currentTime: 0,
      duration: track?.duration || 0,
    };
    this.notify();
  }

  public stopCategory(categoryId: string, allSoundsInBoard: SoundItem[] = [], exceptSoundId?: string) {
    const categorySoundIds = new Set(
      allSoundsInBoard
        .filter(s => s.categoryId === categoryId && s.id !== exceptSoundId)
        .map(s => s.id)
    );

    this.activeTracks.forEach((track, id) => {
      if (categorySoundIds.has(id) || (track.sound.categoryId === categoryId && id !== exceptSoundId)) {
        this.stop(id);
      }
    });
  }

  public stopAll() {
    this.activeTracks.forEach((track, id) => {
      try {
        track.source.onended = null;
        track.source.stop(0);
        track.source.disconnect();
        track.gainNode.disconnect();
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
    });
    this.activeTracks.clear();

    Object.keys(this.states).forEach(id => {
      if (this.states[id]?.isPlaying) {
        this.states[id] = {
          ...this.states[id],
          isPlaying: false,
          currentTime: 0,
        };
      }
    });

    if (this.progressIntervalId !== null) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }

    this.notify();
  }

  public isPlaying(soundId: string): boolean {
    return !!this.states[soundId]?.isPlaying;
  }

  public getPlayingSoundIds(): string[] {
    return Object.keys(this.states).filter(id => this.states[id]?.isPlaying);
  }

  public setSoundVolume(soundId: string, volume: number) {
    const track = this.activeTracks.get(soundId);
    if (track && this.ctx) {
      track.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume * 0.85, this.ctx.currentTime);
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
