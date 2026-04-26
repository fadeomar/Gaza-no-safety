let audioContext: AudioContext | null = null;
let ambienceTimer: number | null = null;
let ambienceEnabled = false;
let lastLowHealthPulse = 0;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => undefined);
  return audioContext;
}

function tone(frequency: number, duration: number, type: OscillatorType, gainValue: number, ramp = true) {
  const ctx = getContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
}

function noiseBurst(duration: number, gainValue: number, highpass = 180) {
  const ctx = getContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.stop(ctx.currentTime + duration);
}

export function startAmbience() {
  if (typeof window === 'undefined' || ambienceEnabled) return;
  ambienceEnabled = true;
  const loop = () => {
    const ctx = getContext();
    if (!ctx || !ambienceEnabled) return;
    tone(48 + Math.random() * 10, 2.1, 'sine', 0.014);
    setTimeout(() => tone(86 + Math.random() * 18, 0.28, 'triangle', 0.009), 260);
    setTimeout(() => noiseBurst(0.22, 0.006, 400), 420);
    ambienceTimer = window.setTimeout(loop, 2400 + Math.random() * 1000);
  };
  loop();
}

export function stopAmbience() {
  ambienceEnabled = false;
  if (ambienceTimer) {
    window.clearTimeout(ambienceTimer);
    ambienceTimer = null;
  }
}

export function playDamageSound() {
  tone(170, 0.08, 'sawtooth', 0.028);
  setTimeout(() => tone(126, 0.08, 'triangle', 0.018), 40);
}

export function playDiscoverySound() {
  tone(520, 0.12, 'triangle', 0.03);
  setTimeout(() => tone(720, 0.16, 'triangle', 0.025), 70);
}

export function playSuccessSound() {
  tone(420, 0.12, 'sine', 0.03);
  setTimeout(() => tone(620, 0.14, 'sine', 0.025), 90);
  setTimeout(() => tone(820, 0.18, 'sine', 0.02), 180);
}

export function playAlertSound() {
  tone(820, 0.08, 'square', 0.026);
  setTimeout(() => tone(660, 0.1, 'square', 0.021), 110);
  setTimeout(() => tone(820, 0.08, 'square', 0.024), 250);
}

export function playStrikeWarningSound() {
  tone(640, 0.06, 'triangle', 0.02);
  setTimeout(() => tone(780, 0.08, 'triangle', 0.017), 70);
}

export function playExplosionSound() {
  tone(88, 0.28, 'sawtooth', 0.042);
  setTimeout(() => tone(62, 0.38, 'triangle', 0.028), 18);
  setTimeout(() => noiseBurst(0.22, 0.035, 120), 8);
}

export function playLowHealthPulse(force = false) {
  const now = Date.now();
  if (!force && now - lastLowHealthPulse < 1250) return;
  lastLowHealthPulse = now;
  tone(120, 0.12, 'sine', 0.023);
  setTimeout(() => tone(96, 0.1, 'sine', 0.018), 180);
}
