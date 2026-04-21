let audioContext: AudioContext | null = null;

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

function tone(frequency: number, duration: number, type: OscillatorType, gainValue: number) {
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
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
}

export function playDamageSound() {
  tone(170, 0.08, 'sawtooth', 0.03);
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
