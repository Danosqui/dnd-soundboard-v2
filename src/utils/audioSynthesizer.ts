// Utility to synthesize realistic fantasy WAV audio files using Web Audio API OfflineAudioContext

function writeWavHeader(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count (1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function createDemoSoundBlob(type: 'sword' | 'spell' | 'thunder' | 'drums' | 'tavern'): Promise<Blob> {
  const sampleRate = 44100;
  let duration = 2.5;

  if (type === 'drums' || type === 'tavern') {
    duration = 4.0; // Looping rhythm
  } else if (type === 'thunder') {
    duration = 3.5;
  }

  const length = sampleRate * duration;
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);

  if (type === 'sword') {
    // Whoosh + high ring
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, 0);
    osc.frequency.exponentialRampToValueAtTime(120, 0.35);

    gain.gain.setValueAtTime(0.01, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.45);

    // Metal clink ring
    const ring = offlineCtx.createOscillator();
    const ringGain = offlineCtx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(2400, 0.1);
    ring.frequency.exponentialRampToValueAtTime(2100, 1.2);

    ringGain.gain.setValueAtTime(0, 0);
    ringGain.gain.setValueAtTime(0.4, 0.1);
    ringGain.gain.exponentialRampToValueAtTime(0.001, 1.2);

    osc.connect(gain).connect(offlineCtx.destination);
    ring.connect(ringGain).connect(offlineCtx.destination);
    osc.start(0);
    ring.start(0.1);

  } else if (type === 'spell') {
    // Mystical arpeggio + chime
    const freqs = [330, 440, 554, 659, 880];
    freqs.forEach((f, i) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, 0.1 * i);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, 0.1 * i + 0.8);

      gain.gain.setValueAtTime(0, 0);
      gain.gain.setValueAtTime(0.3, 0.1 * i);
      gain.gain.exponentialRampToValueAtTime(0.001, 0.1 * i + 1.2);

      osc.connect(gain).connect(offlineCtx.destination);
      osc.start(0.1 * i);
    });

  } else if (type === 'thunder') {
    // Low noise burst
    const bufferSize = sampleRate * duration;
    const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = offlineCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, 0);
    filter.frequency.exponentialRampToValueAtTime(60, 2.5);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.01, 0);
    gain.gain.linearRampToValueAtTime(0.9, 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, 3.2);

    whiteNoise.connect(filter).connect(gain).connect(offlineCtx.destination);
    whiteNoise.start(0);

  } else if (type === 'drums') {
    // Battle War Drum beat (4 hits loopable)
    [0.0, 1.0, 2.0, 3.0].forEach((time, beatIdx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(beatIdx === 0 ? 110 : 90, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.3);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(gain).connect(offlineCtx.destination);
      osc.start(time);
    });

  } else if (type === 'tavern') {
    // Warm tavern lute chord loop
    const chords = [220, 277, 330, 440];
    chords.forEach((f, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, 0);

      gain.gain.setValueAtTime(0.15, 0);
      gain.gain.exponentialRampToValueAtTime(0.05, 3.5);
      gain.gain.linearRampToValueAtTime(0.001, 3.9);

      osc.connect(gain).connect(offlineCtx.destination);
      osc.start(0);
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const samples = renderedBuffer.getChannelData(0);
  const wavBytes = writeWavHeader(samples, sampleRate);

  return new Blob([wavBytes], { type: 'audio/wav' });
}
