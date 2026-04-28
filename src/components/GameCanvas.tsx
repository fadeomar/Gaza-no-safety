import { useEffect, useMemo, useRef } from 'react';
import heroDown from '../assets/hero-down.svg';
import heroLeft from '../assets/hero-left.svg';
import heroRight from '../assets/hero-right.svg';
import heroUp from '../assets/hero-up.svg';
import { VIEWPORT_H, VIEWPORT_W } from '../game/constants';
import type { GameState, Language, StrikeZone, Wall } from '../game/types';
import { clamp, worldToScreen } from '../game/utils';

type Props = {
  frame: number;
  state: GameState;
  language: Language;
};

const MOBILE_VIRTUAL_W = 540;

function getVirtualViewport(rect: DOMRect) {
  const aspect = rect.width / Math.max(1, rect.height);
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (aspect < 0.82) {
    return {
      width: MOBILE_VIRTUAL_W,
      height: clamp(MOBILE_VIRTUAL_W / aspect, 860, 1180),
      safeTop: 88,
      safeBottom: 310,
    };
  }
  if (isCoarsePointer) {
    return {
      width: VIEWPORT_W,
      height: VIEWPORT_H,
      safeTop: 100,
      safeBottom: 260,
    };
  }
  return {
    width: VIEWPORT_W,
    height: VIEWPORT_H,
    safeTop: 0,
    safeBottom: 0,
  };
}

function syncCanvasSize(canvas: HTMLCanvasElement | null, state: GameState) {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const viewport = getVirtualViewport(rect);
  const maxX = Math.max(0, state.level.worldWidth - viewport.width);
  const minY = -viewport.safeTop;
  const maxY = Math.max(minY, state.level.worldHeight - viewport.height + viewport.safeBottom);
  state.camera.width = viewport.width;
  state.camera.height = viewport.height;
  state.camera.safeTop = viewport.safeTop;
  state.camera.safeBottom = viewport.safeBottom;
  state.camera.x = clamp(state.camera.x, 0, maxX);
  state.camera.y = clamp(state.camera.y, minY, maxY);
  const backingWidth = Math.max(1, Math.round(rect.width * ratio));
  const backingHeight = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const scaleX = rect.width / viewport.width;
  const scaleY = rect.height / viewport.height;
  ctx.scale(scaleX, scaleY);
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, state: GameState, sprites: Record<string, HTMLImageElement | null>) {
  const { player } = state;
  const bob = player.isMoving ? Math.sin(player.walkTime) * (player.isSprinting ? 3.2 : 1.8) : Math.sin(state.ambientPulse * 2) * 0.5;
  const stride = player.isMoving ? Math.sin(player.walkTime * 0.9) * (player.isSprinting ? 4.2 : 2.6) : 0;
  const sprite = sprites[player.facing] ?? null;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();

  if (sprite && sprite.complete) ctx.drawImage(sprite, -34, -46 + stride * 0.16, 68, 68);
  else {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player.isMoving) {
    ctx.fillStyle = 'rgba(226,232,240,0.18)';
    ctx.fillRect(-9, 22 + Math.abs(stride) * 0.25, 6, 2.2);
    ctx.fillRect(3, 22 + Math.abs(stride) * 0.25, 6, 2.2);
  }
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, state: GameState) {
  const { level, camera, ambientPulse } = state;
  const sky = ctx.createLinearGradient(0, 0, 0, camera.height);
  sky.addColorStop(0, '#09111f');
  sky.addColorStop(1, '#030711');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, camera.width, camera.height);

  const floor = ctx.createLinearGradient(0, 0, 0, camera.height);
  floor.addColorStop(0, '#111a27');
  floor.addColorStop(1, '#0a1019');
  ctx.fillStyle = floor;
  ctx.fillRect(-camera.x, -camera.y, level.worldWidth, level.worldHeight);

  for (let x = 0; x < level.worldWidth; x += 120) {
    for (let y = 0; y < level.worldHeight; y += 120) {
      const s = worldToScreen(camera, x + ((y / 120) % 2) * 18, y);
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(s.x + 10, s.y + 16, 2, 2);
      ctx.fillRect(s.x + 56, s.y + 66, 2, 2);
      ctx.fillRect(s.x + 92, s.y + 30, 3, 3);
    }
  }

  for (let i = 0; i < 18; i += 1) {
    const x = ((ambientPulse * 15) + i * 111) % (level.worldWidth + 200) - 100;
    const y = (i * 97) % level.worldHeight;
    const s = worldToScreen(camera, x, y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 42 + (i % 3) * 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,180,120,0.025)';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 8;
  ctx.strokeRect(-camera.x, -camera.y, level.worldWidth, level.worldHeight);
}

function rubbleNoise(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawWallRubble(ctx: CanvasRenderingContext2D, camera: GameState['camera'], wall: Wall, seed: number) {
  const screen = worldToScreen(camera, wall.x, wall.y);
  const chip = Math.min(18, Math.max(7, Math.min(wall.width, wall.height) * 0.24));
  const points = [
    { x: screen.x + chip * rubbleNoise(seed, 1), y: screen.y + chip * rubbleNoise(seed, 2) },
    { x: screen.x + wall.width * 0.34, y: screen.y + chip * rubbleNoise(seed, 3) },
    { x: screen.x + wall.width * 0.68, y: screen.y + chip * rubbleNoise(seed, 4) },
    { x: screen.x + wall.width - chip * rubbleNoise(seed, 5), y: screen.y + chip * rubbleNoise(seed, 6) },
    { x: screen.x + wall.width - chip * rubbleNoise(seed, 7), y: screen.y + wall.height * 0.38 },
    { x: screen.x + wall.width - chip * rubbleNoise(seed, 8), y: screen.y + wall.height - chip * rubbleNoise(seed, 9) },
    { x: screen.x + wall.width * 0.62, y: screen.y + wall.height - chip * rubbleNoise(seed, 10) },
    { x: screen.x + wall.width * 0.26, y: screen.y + wall.height - chip * rubbleNoise(seed, 11) },
    { x: screen.x + chip * rubbleNoise(seed, 12), y: screen.y + wall.height - chip * rubbleNoise(seed, 13) },
    { x: screen.x + chip * rubbleNoise(seed, 14), y: screen.y + wall.height * 0.46 },
  ];

  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  const body = ctx.createLinearGradient(screen.x, screen.y, screen.x + wall.width, screen.y + wall.height);
  body.addColorStop(0, '#69717d');
  body.addColorStop(0.46, '#555f6d');
  body.addColorStop(1, '#343d4c');
  ctx.fillStyle = body;
  ctx.fill();

  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fillRect(screen.x + 6, screen.y + 6, wall.width - 12, Math.max(5, wall.height * 0.14));
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(screen.x + 4, screen.y + wall.height - Math.max(9, wall.height * 0.26), wall.width - 8, Math.max(8, wall.height * 0.22));

  ctx.strokeStyle = 'rgba(20,28,39,0.72)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 5; i += 1) {
    const startX = screen.x + 10 + rubbleNoise(seed, 20 + i) * Math.max(12, wall.width - 20);
    const startY = screen.y + 8 + rubbleNoise(seed, 30 + i) * Math.max(12, wall.height - 18);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (rubbleNoise(seed, 40 + i) - 0.5) * 42, startY + 12 + rubbleNoise(seed, 50 + i) * 38);
    ctx.lineTo(startX + (rubbleNoise(seed, 60 + i) - 0.5) * 64, startY + 28 + rubbleNoise(seed, 70 + i) * 44);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(28,35,44,0.86)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const rx = screen.x + rubbleNoise(seed, 80 + i) * wall.width;
    const ry = screen.y + rubbleNoise(seed, 90 + i) * wall.height;
    ctx.beginPath();
    ctx.moveTo(rx - 18, ry + 8);
    ctx.lineTo(rx + 18, ry - 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(155,166,181,0.42)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rx - 20, ry + 6);
    ctx.lineTo(rx + 20, ry - 10);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,35,44,0.86)';
    ctx.lineWidth = 3;
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();

  const fragments = Math.max(6, Math.floor((wall.width + wall.height) / 56));
  for (let i = 0; i < fragments; i += 1) {
    const rx = screen.x - 10 + rubbleNoise(seed, 100 + i) * (wall.width + 20);
    const ry = screen.y + wall.height - 4 + rubbleNoise(seed, 130 + i) * 18;
    const size = 4 + rubbleNoise(seed, 160 + i) * 10;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + size, ry + rubbleNoise(seed, 190 + i) * 5);
    ctx.lineTo(rx + size * 0.72, ry + size * 0.72);
    ctx.lineTo(rx - size * 0.25, ry + size * 0.45);
    ctx.closePath();
    ctx.fillStyle = i % 3 === 0 ? 'rgba(115,125,145,0.78)' : i % 3 === 1 ? 'rgba(70,80,94,0.86)' : 'rgba(44,52,64,0.88)';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(34, 42, 52, 0.86)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const x = screen.x + rubbleNoise(seed, 220 + i) * wall.width;
    const y = screen.y + wall.height * (0.15 + rubbleNoise(seed, 230 + i) * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12 + rubbleNoise(seed, 240 + i) * 18, y + 8 + rubbleNoise(seed, 250 + i) * 16);
    ctx.stroke();
  }
}

function drawStaticHazards(ctx: CanvasRenderingContext2D, state: GameState) {
  const { level, camera } = state;
  for (const hazard of level.hazards) {
    const screen = worldToScreen(camera, hazard.x, hazard.y);
    const pulse = 1 + Math.sin(hazard.phase ?? 0) * 0.06;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, hazard.radius * 0.94 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.075)';
    ctx.fill();

    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(screen.x + Math.sin((hazard.phase ?? 0) + i * 0.8) * (8 + i * 3), screen.y - 10 - i * 7, 9 - i * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,120,80,${0.16 - i * 0.03})`;
      ctx.fill();
    }
  }
}

function drawStrike(ctx: CanvasRenderingContext2D, camera: GameState['camera'], strike: StrikeZone) {
  const screen = worldToScreen(camera, strike.x, strike.y);
  if (strike.phase === 'warning') {
    const alpha = 0.36 + Math.sin(strike.pulse) * 0.18;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * (0.84 + Math.sin(strike.pulse * 0.6) * 0.05), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(245, 158, 11, ${0.12 + alpha * 0.22})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.42 + alpha * 0.35})`;
    ctx.lineWidth = strike.pattern === 'line' ? 2 : 3;
    ctx.setLineDash(strike.pattern === 'line' ? [16, 8] : [10, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (strike.phase === 'impact') {
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 245, 210, 0.88)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * 1.22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 152, 80, 0.62)';
    ctx.lineWidth = 8;
    ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7 + strike.age * 8;
      ctx.fillStyle = 'rgba(255,180,120,0.55)';
      ctx.fillRect(screen.x + Math.cos(angle) * (strike.radius * 0.35), screen.y + Math.sin(angle) * (strike.radius * 0.35), 4, 4);
    }
  } else {
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * 0.84, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,146,60,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, strike.radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(35,35,35,0.25)';
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(screen.x + Math.cos(strike.age * 2 + i) * 10, screen.y - 10 - i * 6, 10 - i * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,160,160,${0.15 - i * 0.02})`;
      ctx.fill();
    }
  }
}

function renderState(ctx: CanvasRenderingContext2D, state: GameState, _language: Language, sprites: Record<string, HTMLImageElement | null>) {
  const { level, player, camera, screenShake, damageFlash, safeDiscovered, hintStrength, timeAlive, extractionPulse } = state;
  const shakeX = (Math.random() - 0.5) * screenShake;
  const shakeY = (Math.random() - 0.5) * screenShake;

  ctx.save();
  ctx.clearRect(0, 0, camera.width, camera.height);
  ctx.translate(shakeX, shakeY);

  drawGround(ctx, state);
  drawStaticHazards(ctx, state);
  for (const strike of state.strikes) drawStrike(ctx, camera, strike);
  for (const wall of level.walls) drawWallRubble(ctx, camera, wall, wall.x + wall.y);

  for (const drone of level.drones) {
    const screen = worldToScreen(camera, drone.x, drone.y);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, drone.r + 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,146,60,0.11)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, drone.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fb923c';
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(screen.x - 16, screen.y - 2, 32, 4);
    ctx.fillRect(screen.x - 2, screen.y - 16, 4, 32);
  }

  const pulse = 1 + Math.sin(extractionPulse * 4) * 0.09;
  const visibility = safeDiscovered ? 1 : 0.06;
  const safeScreen = worldToScreen(camera, level.safeZone.x, level.safeZone.y);
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * 2.2 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(34,197,94,${0.17 * visibility})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * 1.25 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(34,197,94,${0.34 * visibility})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220,252,231,${0.98 * visibility})`;
  ctx.fill();
  if (safeDiscovered) {
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(safeScreen.x, safeScreen.y - 60);
    ctx.lineTo(safeScreen.x, safeScreen.y - 18);
    ctx.stroke();
  }

  if (hintStrength > 0 && safeDiscovered) {
    const playerScreen = worldToScreen(camera, player.x, player.y);
    ctx.beginPath();
    ctx.moveTo(playerScreen.x, playerScreen.y);
    ctx.lineTo(playerScreen.x + (safeScreen.x - playerScreen.x) * 0.25, playerScreen.y + (safeScreen.y - playerScreen.y) * 0.25);
    ctx.strokeStyle = `rgba(74,222,128,${0.35 * hintStrength})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  const playerScreen = worldToScreen(camera, player.x, player.y);
  drawHero(ctx, playerScreen.x, playerScreen.y, state, sprites);

  const vignetteRadius = Math.max(camera.width, camera.height) * 0.72;
  const vignette = ctx.createRadialGradient(camera.width / 2, camera.height / 2, 140, camera.width / 2, camera.height / 2, vignetteRadius);
  vignette.addColorStop(0, `rgba(0,0,0,${level.fogAlpha})`);
  vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, camera.width, camera.height);

  if (player.health < 30) {
    const lowHealthAlpha = 0.08 + (1 - player.health / 30) * 0.12 * (0.7 + Math.sin(timeAlive * 6) * 0.3);
    ctx.fillStyle = `rgba(239,68,68,${lowHealthAlpha})`;
    ctx.fillRect(0, 0, camera.width, camera.height);
  }

  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(255,160,120,${0.16 * damageFlash})`;
    ctx.fillRect(0, 0, camera.width, camera.height);
  }

  ctx.restore();
}

export default function GameCanvas({ frame, state, language }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sprites = useMemo(() => {
    const up = new Image();
    up.src = heroUp;
    const down = new Image();
    down.src = heroDown;
    const left = new Image();
    left.src = heroLeft;
    const right = new Image();
    right.src = heroRight;
    return { up, down, left, right };
  }, []);

  useEffect(() => {
    syncCanvasSize(canvasRef.current, state);
    const onResize = () => syncCanvasSize(canvasRef.current, state);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncCanvasSize(canvas, state);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderState(ctx, state, language, sprites);
  }, [frame, state, language, sprites]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="game canvas" />;
}
