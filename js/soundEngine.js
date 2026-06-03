let sharedAudioCtx = null;

const WET_LEVEL = 0.35;
let _masterGain = null;
let _compressor = null;
let _reverbBus = null; // { convolver, wetGain }

const MASTER_THRESHOLD = -18;
const MASTER_KNEE = 24;
const MASTER_RATIO = 6;
const MASTER_ATTACK = 0.003;
const MASTER_RELEASE = 0.25;

let _activeVoices = 0;

function voiceScaledPeak(basePeak) {
  const n = Math.max(1, _activeVoices);
  return basePeak / Math.sqrt(n);
}

// --- Reverb impulse response (shaped exponential decay) ---
function createReverbIR(ctx, { duration = 2.0, decay = 3.0, lpCoeff = 0.18 } = {}) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const ir = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < ir.numberOfChannels; ch++) {
    const data = ir.getChannelData(ch);
    let lp = 0; // one-pole low-pass state, reset per channel
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Roll off highs progressively -> warmer, less metallic tail
      lp += lpCoeff * (white - lp);
      // Exponential decay envelope (decay > 1 => faster initial fall, long quiet tail)
      const env = Math.pow(1 - i / length, decay);
      data[i] = lp * env;
    }
  }
  return ir;
}

function getMasterGain(ctx) {
  if (_masterGain) return _masterGain;
  _masterGain = ctx.createGain();
  _masterGain.gain.value = 1.0;

  _compressor = ctx.createDynamicsCompressor();
  _compressor.threshold.value = MASTER_THRESHOLD;
  _compressor.knee.value = MASTER_KNEE;
  _compressor.ratio.value = MASTER_RATIO;
  _compressor.attack.value = MASTER_ATTACK;
  _compressor.release.value = MASTER_RELEASE;

  _masterGain.connect(_compressor).connect(ctx.destination);
  return _masterGain;
}

function getReverbBus(ctx) {
  if (_reverbBus) return _reverbBus;
  const master = getMasterGain(ctx);
  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbIR(ctx);      // generated once
  const wetGain = ctx.createGain();
  wetGain.gain.value = WET_LEVEL;
  convolver.connect(wetGain).connect(master);  // reverb return path
  _reverbBus = { convolver, wetGain };
  return _reverbBus;
}

const PENTATONIC_SCALE = [
  110.00, 130.81, 146.83, 164.81, 196.00,
  220.00, 261.63, 293.66, 329.63, 392.00,
  440.00, 523.25, 587.33, 659.25, 783.99,
  880.00
];

function getEnvelope(magnitude) {
  const m = Math.min(Math.max(magnitude, 0), 10);
  const t = m / 10; // normalized 0-1

  return {
    peakGain:  0.1 + t * 0.3,         // 0.1 (M0) → 0.4 (M10)
    attack:    0.03 + t * 0.07,        // 30ms (M0) → 100ms (M10)
    sustain:   0.05 + t * 0.4,         // 50ms (M0) → 450ms (M10)
    decay:     0.4 + t * 1.2,          // 400ms (M0) → 1600ms (M10)
    total:     0.6 + t * 2.0           // 600ms (M0) → 2600ms (M10)
  };
}

function snapToScale(freq) {
  let closest = PENTATONIC_SCALE[0];
  let minDiff = Math.abs(freq - closest);
  for (let i = 1; i < PENTATONIC_SCALE.length; i++) {
    const diff = Math.abs(freq - PENTATONIC_SCALE[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = PENTATONIC_SCALE[i];
    }
  }
  return closest;
}

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

export function initAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

export function playQuakeSound(magnitude, depth = 10) {
  let audioCtx;
  try {
    audioCtx = getAudioContext();
  } catch (e) {
    console.warn("Audio playback failed:", e);
    return;
  }

  const fundamental = audioCtx.createOscillator();
  const fundamentalGain = audioCtx.createGain();

  const octaveOsc = audioCtx.createOscillator();
  const octaveGain = audioCtx.createGain();

  const fifthOsc = audioCtx.createOscillator();
  const fifthGain = audioCtx.createGain();

  const voiceGain = audioCtx.createGain();

  fundamental.type = 'triangle';
  octaveOsc.type = 'sine';
  fifthOsc.type = 'sine';

  // Ascending pitch mapping (M0 = 100Hz, M10 = 900Hz)
  const minPitch = 100;
  const maxPitch = 900;
  const clampedMag = Math.min(Math.max(magnitude, 0), 10);
  const freq = minPitch + ((clampedMag / 10) * (maxPitch - minPitch));

  const quantizedFreq = snapToScale(freq);

  fundamental.frequency.value = quantizedFreq;
  octaveOsc.frequency.value = quantizedFreq * 2;
  fifthOsc.frequency.value = quantizedFreq * 1.5;

  fundamentalGain.gain.value = 1.0;
  octaveGain.gain.value = 0.3;
  fifthGain.gain.value = 0.15;

  // Gain envelope
  _activeVoices++;

  const env = getEnvelope(clampedMag);
  const now = audioCtx.currentTime;

  const peak = voiceScaledPeak(env.peakGain);

  voiceGain.gain.setValueAtTime(0.0, now);
  voiceGain.gain.linearRampToValueAtTime(peak, now + env.attack);
  voiceGain.gain.setValueAtTime(peak, now + env.attack + env.sustain);
  voiceGain.gain.exponentialRampToValueAtTime(0.001, now + env.attack + env.sustain + env.decay);

  fundamental.connect(fundamentalGain).connect(voiceGain);
  octaveOsc.connect(octaveGain).connect(voiceGain);
  fifthOsc.connect(fifthGain).connect(voiceGain);

  const master = getMasterGain(audioCtx);
  const reverb = getReverbBus(audioCtx);

  // Dry path: full level, carries the un-reverbed signal.
  voiceGain.connect(master);

  // Wet path: feed the shared reverb convolver.
  voiceGain.connect(reverb.convolver);

  let _decremented = false;
  fundamental.onended = () => {
    fundamental.disconnect();
    octaveOsc.disconnect();
    fifthOsc.disconnect();
    fundamentalGain.disconnect();
    octaveGain.disconnect();
    fifthGain.disconnect();
    voiceGain.disconnect();

    if (!_decremented) {
      _decremented = true;
      _activeVoices = Math.max(0, _activeVoices - 1);
    }
  };

  fundamental.start(now);
  octaveOsc.start(now);
  fifthOsc.start(now);

  fundamental.stop(now + env.total);
  octaveOsc.stop(now + env.total);
  fifthOsc.stop(now + env.total);
}
