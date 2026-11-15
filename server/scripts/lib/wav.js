export const encodeWav = (float32Samples, sampleRate = 22050) => {
  const numSamples = float32Samples.length;
  const subchunk2Size = numSamples * 2;
  const buffer = Buffer.alloc(44 + subchunk2Size);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + subchunk2Size, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(subchunk2Size, 40);

  // 16-bit PCM samples
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, float32Samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.round(intSample), 44 + i * 2);
  }

  return buffer;
};

// Waveform helpers
const square = (freq, t) => (Math.sin(2 * Math.PI * freq * t) >= 0 ? 0.7 : -0.7);
const sine = (freq, t) => Math.sin(2 * Math.PI * freq * t);
const saw = (freq, t) => 2 * ((freq * t) % 1) - 1;
const triangle = (freq, t) => 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;

export const coin = (sampleRate = 22050) => {
  const dur = 0.28;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const freq = t < 0.1 ? 987.77 : 1318.51; // B5 -> E6
    const env = 1 - t / dur;
    out[i] = square(freq, t) * env * 0.4;
  }
  return out;
};

export const jump = (sampleRate = 22050) => {
  const dur = 0.22;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = t / dur;
    const freq = 160 + progress * 500;
    const env = Math.sin(progress * Math.PI);
    out[i] = square(freq, t) * env * 0.4;
  }
  return out;
};

export const laser = (sampleRate = 22050) => {
  const dur = 0.18;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = t / dur;
    const freq = 900 * Math.exp(-progress * 3.5);
    const env = 1 - progress;
    out[i] = saw(freq, t) * env * 0.4;
  }
  return out;
};

export const explosion = (sampleRate = 22050) => {
  const dur = 0.75;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  let filterVal = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = t / dur;
    const white = (Math.random() * 2 - 1);
    filterVal += (white - filterVal) * 0.12; // Low-pass
    const env = Math.exp(-progress * 4.5);
    out[i] = filterVal * env * 0.7;
  }
  return out;
};

export const powerUp = (sampleRate = 22050) => {
  const dur = 0.42;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  const freqs = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const step = Math.min(freqs.length - 1, Math.floor((t / dur) * freqs.length));
    const env = 1 - t / dur;
    out[i] = square(freqs[step], t) * env * 0.35;
  }
  return out;
};

export const hit = (sampleRate = 22050) => {
  const dur = 0.16;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = t / dur;
    const noise = (Math.random() * 2 - 1) * Math.exp(-progress * 15);
    const tone = square(120, t) * (1 - progress);
    out[i] = (noise * 0.4 + tone * 0.3) * (1 - progress);
  }
  return out;
};

export const blip = (sampleRate = 22050) => {
  const dur = 0.05;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    out[i] = sine(800, t) * (1 - t / dur) * 0.3;
  }
  return out;
};

export const select = (sampleRate = 22050) => {
  const dur = 0.08;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const freq = t < 0.04 ? 1200 : 1600;
    out[i] = sine(freq, t) * (1 - t / dur) * 0.3;
  }
  return out;
};

export const gameOver = (sampleRate = 22050) => {
  const dur = 0.7;
  const len = Math.floor(dur * sampleRate);
  const out = new Float32Array(len);
  const notes = [392.0, 329.63, 261.63]; // G4 -> E4 -> C4
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const step = Math.min(2, Math.floor((t / dur) * 3));
    out[i] = square(notes[step], t) * (1 - (t / dur) * 0.8) * 0.35;
  }
  return out;
};

export const chiptuneLoop = (seed = 'loop', bars = 8, bpm = 128, sampleRate = 22050) => {
  // Simple deterministic PRNG
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rnd = () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };

  const beatsPerBar = 4;
  const totalBeats = bars * beatsPerBar;
  const secondsPerBeat = 60 / bpm;
  const totalSeconds = totalBeats * secondsPerBeat;
  const totalSamples = Math.floor(totalSeconds * sampleRate);
  const out = new Float32Array(totalSamples);

  // Pentatonic scale freqs (C4, D4, E4, G4, A4, C5, D5, E5)
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const bassNotes = [130.81, 164.81, 196.0, 220.0]; // C3, E3, G3, A3

  // Generate 16-step melody pattern
  const melodySteps = Array.from({ length: 16 }, () => scale[Math.floor(rnd() * scale.length)]);
  const stepDur = secondsPerBeat / 2;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beat = t / secondsPerBeat;
    const step = Math.floor(t / stepDur) % 16;
    const stepT = t % stepDur;

    // Melody (Square)
    const melFreq = melodySteps[step];
    const melEnv = Math.max(0, 1 - (stepT / stepDur) * 1.5);
    const mel = square(melFreq, t) * melEnv * 0.22;

    // Bass (Triangle)
    const bar = Math.floor(beat / beatsPerBar) % bassNotes.length;
    const bassFreq = bassNotes[bar];
    const bass = triangle(bassFreq, t) * 0.25;

    // Hi-hat noise on off-beats
    const isOffbeat = Math.floor(beat * 2) % 2 === 1;
    const offbeatT = (t % (secondsPerBeat / 2));
    const hatEnv = isOffbeat ? Math.exp(-offbeatT * 40) : 0;
    const hat = (Math.random() * 2 - 1) * hatEnv * 0.15;

    out[i] = mel + bass + hat;
  }

  return out;
};

export default {
  encodeWav,
  coin,
  jump,
  laser,
  explosion,
  powerUp,
  hit,
  blip,
  select,
  gameOver,
  chiptuneLoop,
};
