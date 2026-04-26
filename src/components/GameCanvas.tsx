import { useEffect, useMemo, useRef } from 'react';
import heroDown from '../assets/hero-down.svg';
import heroLeft from '../assets/hero-left.svg';
import heroRight from '../assets/hero-right.svg';
import heroUp from '../assets/hero-up.svg';
import { VIEWPORT_H, VIEWPORT_W } from '../game/constants';
import type { GameState, Language, StrikeZone, Wall } from '../game/types';
import { worldToScreen } from '../game/utils';

type Props = {
  frame: number;
  state: GameState;
  language: Language;
};

function syncCanvasSize(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const scaleX = rect.width / VIEWPORT_W;
  const scaleY = rect.height / VIEWPORT_H;
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
  const sky = ctx.createLinearGradient(0, 0, 0, VIEWPORT_H);
  sky.addColorStop(0, '#09111f');
  sky.addColorStop(1, '#030711');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  const floor = ctx.createLinearGradient(0, 0, 0, VIEWPORT_H);
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

function drawWallRubble(ctx: CanvasRenderingContext2D, camera: GameState['camera'], wall: Wall, seed: number) {
  const screen = worldToScreen(camera, wall.x, wall.y);
  const body = ctx.createLinearGradient(screen.x, screen.y, screen.x + wall.width, screen.y + wall.height);
  body.addColorStop(0, '#687487');
  body.addColorStop(1, '#4e596b');
  ctx.fillStyle = body;
  ctx.fillRect(screen.x, screen.y, wall.width, wall.height);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(screen.x + 4, screen.y + 4, wall.width - 8, Math.max(6, wall.height * 0.18));
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(screen.x + 4, screen.y + wall.height - Math.max(8, wall.height * 0.22), wall.width - 8, Math.max(6, wall.height * 0.2));

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(screen.x, screen.y, wall.width, wall.height);

  for (let i = 0; i < Math.max(3, Math.floor((wall.width + wall.height) / 80)); i += 1) {
    const rx = screen.x + 8 + ((i * 29 + seed * 11) % Math.max(18, wall.width - 18));
    const ry = screen.y + 7 + ((i * 17 + seed * 5) % Math.max(18, wall.height - 18));
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rx, ry, 10, 10);
  }

  ctx.strokeStyle = 'rgba(30,41,59,0.65)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    const cx = screen.x + 10 + ((seed + i * 33) % Math.max(24, wall.width - 20));
    const cy = screen.y + 12 + ((seed + i * 21) % Math.max(20, wall.height - 18));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 8, cy + 5);
    ctx.lineTo(cx + 3, cy + 13);
    ctx.stroke();
  }

  for (let i = 0; i < 5; i += 1) {
    const px = screen.x - 8 + i * 12 + (seed % 5);
    const py = screen.y + wall.height + 4 + (i % 2) * 5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(115, 125, 145, 0.7)' : 'rgba(86, 96, 116, 0.75)';
    ctx.fillRect(px, py, 7 + (i % 3), 5 + (i % 2));
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
  ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
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

  const vignette = ctx.createRadialGradient(VIEWPORT_W / 2, VIEWPORT_H / 2, 140, VIEWPORT_W / 2, VIEWPORT_H / 2, 620);
  vignette.addColorStop(0, `rgba(0,0,0,${level.fogAlpha})`);
  vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  if (player.health < 30) {
    const lowHealthAlpha = 0.08 + (1 - player.health / 30) * 0.12 * (0.7 + Math.sin(timeAlive * 6) * 0.3);
    ctx.fillStyle = `rgba(239,68,68,${lowHealthAlpha})`;
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);
  }

  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(255,160,120,${0.16 * damageFlash})`;
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);
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
    syncCanvasSize(canvasRef.current);
    const onResize = () => syncCanvasSize(canvasRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderState(ctx, state, language, sprites);
  }, [frame, state, language, sprites]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="game canvas" />;
}
