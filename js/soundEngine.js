export function playQuakeSound(magnitude, depth = 10) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const convolver = audioCtx.createConvolver();

    oscillator.type = 'sine';

    // Ascending pitch mapping (M0 = 100Hz, M10 = 900Hz)
    const minPitch = 100;
    const maxPitch = 900;
    const clampedMag = Math.min(Math.max(magnitude, 0), 10);
    const freq = minPitch + ((clampedMag / 10) * (maxPitch - minPitch));
    oscillator.frequency.value = freq;

    // Reverb duration based on depth
    const clampedDepth = Math.min(Math.max(depth, 1), 700);
    const reverbDuration = 0.5 + (1 - (clampedDepth / 700)) * 1.0;
    const impulse = audioCtx.createBuffer(2, audioCtx.sampleRate * reverbDuration, audioCtx.sampleRate);
    for (let i = 0; i < impulse.numberOfChannels; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < channel.length; j++) {
        channel[j] = (Math.random() * 2 - 1) * (1 - j / channel.length);
      }
    }
    convolver.buffer = impulse;

    // Gain envelope
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    oscillator.connect(convolver).connect(gainNode).connect(audioCtx.destination);
    oscillator.start(now);
    oscillator.stop(now + 1.2);
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}