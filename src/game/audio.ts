import droneAmbienceUrl from "../assets/drone-ambience.mp3";
import nearbyExplosionUrl from "../assets/nearby-explosion.mp3";

const AMBIENCE_VOLUME = 0.3;
const EXPLOSION_VOLUME = 0.56;
const EXPLOSION_COOLDOWN_MS = 11_000;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambienceAudio: HTMLAudioElement | null = null;
let explosionAudio: HTMLAudioElement | null = null;
let ambienceEnabled = false;
let lastLowHealthPulse = 0;
let lastExplosionAt = 0;
let muted = false;

function getAudioConstructor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

function getContext() {
  const Ctx = getAudioConstructor();
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : 0.5;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended")
    audioContext.resume().catch(() => undefined);
  return audioContext;
}

function output() {
  getContext();
  return masterGain;
}

function getAmbienceAudio() {
  if (typeof Audio === "undefined") return null;
  if (!ambienceAudio) {
    ambienceAudio = new Audio(droneAmbienceUrl);
    ambienceAudio.loop = true;
    ambienceAudio.preload = "auto";
    ambienceAudio.volume = muted ? 0 : AMBIENCE_VOLUME;
  }
  return ambienceAudio;
}

function getExplosionAudio() {
  if (typeof Audio === "undefined") return null;
  if (!explosionAudio) {
    explosionAudio = new Audio(nearbyExplosionUrl);
    explosionAudio.loop = false;
    explosionAudio.preload = "auto";
    explosionAudio.volume = muted ? 0 : EXPLOSION_VOLUME;
  }
  return explosionAudio;
}

function playElement(audio: HTMLAudioElement) {
  return audio.play().catch(() => false);
}

export function unlockAudio() {
  const ctx = getContext();
  if (ctx) ctx.resume().catch(() => undefined);
  getAmbienceAudio()?.load();
  getExplosionAudio()?.load();
}

export function setAudioMuted(value: boolean) {
  muted = value;
  if (audioContext && masterGain) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(
      muted ? 0 : 0.5,
      audioContext.currentTime,
      0.025,
    );
  }

  const ambience = ambienceAudio;
  if (ambience) {
    ambience.volume = muted ? 0 : AMBIENCE_VOLUME;
    if (muted) {
      ambience.pause();
    } else if (ambienceEnabled) {
      playElement(ambience).then((played) => {
        if (played === false) fallbackAmbiencePulse();
      });
    }
  }

  const explosion = explosionAudio;
  if (explosion) explosion.volume = muted ? 0 : EXPLOSION_VOLUME;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  startDelay = 0,
  ramp = true,
) {
  const ctx = getContext();
  const destination = output();
  if (!ctx || !destination || muted) return;
  const start = ctx.currentTime + startDelay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.stop(start + duration + 0.02);
}

function noiseBurst(
  duration: number,
  gainValue: number,
  highpass = 180,
  lowpass = 4200,
  startDelay = 0,
) {
  const ctx = getContext();
  const destination = output();
  if (!ctx || !destination || muted) return;
  const start = ctx.currentTime + startDelay;
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * duration)),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const fade = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * fade * fade;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = highpass;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(high);
  high.connect(low);
  low.connect(gain);
  gain.connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function fallbackAmbiencePulse() {
  tone(64, 1.6, "sawtooth", 0.006);
}

function fallbackExplosion() {
  tone(48, 0.42, "sine", 0.028);
  noiseBurst(0.24, 0.028, 42, 900, 0.02);
}

export function startAmbience() {
  if (typeof window === "undefined" || ambienceEnabled) return;
  ambienceEnabled = true;
  if (muted) return;

  unlockAudio();
  const ambience = getAmbienceAudio();
  if (!ambience) {
    fallbackAmbiencePulse();
    return;
  }
  ambience.volume = AMBIENCE_VOLUME;
  playElement(ambience).then((played) => {
    if (played === false) fallbackAmbiencePulse();
  });
}

export function stopAmbience() {
  ambienceEnabled = false;
  if (ambienceAudio) ambienceAudio.pause();
}

export function stopGameplayAudio() {
  stopAmbience();

  const audioElements = document.querySelectorAll("audio");

  audioElements.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}
export function playDamageSound() {
  tone(132, 0.08, "triangle", 0.012);
  noiseBurst(0.04, 0.006, 800, 2600);
}

export function playDiscoverySound() {
  tone(440, 0.12, "triangle", 0.018);
  tone(650, 0.16, "triangle", 0.014, 0.08);
}

export function playSuccessSound() {
  tone(380, 0.14, "sine", 0.018);
  tone(560, 0.18, "sine", 0.014, 0.1);
}

export function playAlertSound() {
  unlockAudio();
  tone(610, 0.08, "triangle", 0.014);
  tone(520, 0.1, "triangle", 0.012, 0.12);
}

export function playStrikeWarningSound() {
  tone(420, 0.1, "triangle", 0.012);
  tone(560, 0.08, "triangle", 0.01, 0.08);
}

export function playExplosionSound() {
  if (muted) return;
  const now = Date.now();
  if (now - lastExplosionAt < EXPLOSION_COOLDOWN_MS) return;
  lastExplosionAt = now;

  const explosion = getExplosionAudio();
  if (!explosion) {
    fallbackExplosion();
    return;
  }
  explosion.volume = EXPLOSION_VOLUME;
  explosion.currentTime = 0;
  playElement(explosion).then((played) => {
    if (played === false) fallbackExplosion();
  });
}

export function playLowHealthPulse(force = false) {
  const now = Date.now();
  if (!force && now - lastLowHealthPulse < 1250) return;
  lastLowHealthPulse = now;
  tone(118, 0.13, "sine", 0.012);
  tone(92, 0.12, "sine", 0.009, 0.18);
}
