import { useEffect, useMemo, useRef } from 'react';
import heroDown from '../assets/hero-down.svg';
import heroLeft from '../assets/hero-left.svg';
import heroRight from '../assets/hero-right.svg';
import heroUp from '../assets/hero-up.svg';
import { VIEWPORT_H, VIEWPORT_W } from '../game/constants';
import { t } from '../game/i18n';
import type { GameState, Language } from '../game/types';
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
  const bob = player.isMoving ? Math.sin(player.walkTime) * (player.isSprinting ? 2.8 : 1.6) : 0;
  const stride = player.isMoving ? Math.sin(player.walkTime * 0.9) * (player.isSprinting ? 3.5 : 2.2) : 0;
  const sprite = sprites[player.facing] ?? null;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.beginPath();
  ctx.ellipse(0, 20, 13, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fill();

  if (sprite && sprite.complete) {
    ctx.drawImage(sprite, -32, -44 + stride * 0.15, 64, 64);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderState(ctx: CanvasRenderingContext2D, state: GameState, language: Language, sprites: Record<string, HTMLImageElement | null>) {
  const { level, player, camera, screenShake, damageFlash, safeDiscovered, hintStrength, timeAlive } = state;
  const copy = t(language);
  const shakeX = (Math.random() - 0.5) * screenShake;
  const shakeY = (Math.random() - 0.5) * screenShake;

  ctx.save();
  ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
  ctx.translate(shakeX, shakeY);

  const bg = ctx.createLinearGradient(0, 0, 0, VIEWPORT_H);
  bg.addColorStop(0, '#1f2937');
  bg.addColorStop(1, '#0b1120');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  ctx.fillStyle = '#111827';
  ctx.fillRect(-camera.x, -camera.y, level.worldWidth, level.worldHeight);

  for (let x = 0; x < level.worldWidth; x += 160) {
    for (let y = 0; y < level.worldHeight; y += 160) {
      const screen = worldToScreen(camera, x + ((y / 160) % 2) * 22, y);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(screen.x + 18, screen.y + 26, 3, 3);
      ctx.fillRect(screen.x + 68, screen.y + 84, 2, 2);
      ctx.fillRect(screen.x + 124, screen.y + 40, 4, 4);
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 8;
  ctx.strokeRect(-camera.x, -camera.y, level.worldWidth, level.worldHeight);

  for (const hazard of level.hazards) {
    const radius = hazard.radius + Math.sin(hazard.phase ?? 0) * 8;
    const screen = worldToScreen(camera, hazard.x, hazard.y);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius * 1.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.10)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.20)';
    ctx.fill();
  }

  for (const wall of level.walls) {
    const screen = worldToScreen(camera, wall.x, wall.y);
    ctx.fillStyle = '#5b6677';
    ctx.fillRect(screen.x, screen.y, wall.width, wall.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.x, screen.y, wall.width, wall.height);
    for (let i = 0; i < Math.max(2, Math.floor(wall.width / 70)); i += 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(screen.x + 12 + i * 26, screen.y + 9 + (i % 2) * 12, 10, 10);
    }
  }

  for (const drone of level.drones) {
    const screen = worldToScreen(camera, drone.x, drone.y);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, drone.r + 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,146,60,0.13)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, drone.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fb923c';
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(screen.x - 16, screen.y - 2, 32, 4);
    ctx.fillRect(screen.x - 2, screen.y - 16, 4, 32);
  }

  const pulse = 1 + Math.sin(timeAlive * 4) * 0.08;
  const visibility = safeDiscovered ? 1 : 0.08;
  const safeScreen = worldToScreen(camera, level.safeZone.x, level.safeZone.y);
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * 1.7 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(34,197,94,${0.16 * visibility})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(34,197,94,${0.40 * visibility})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(safeScreen.x, safeScreen.y, level.safeZone.radius * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220,252,231,${0.96 * visibility})`;
  ctx.fill();

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
  vignette.addColorStop(1, 'rgba(0,0,0,0.56)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${0.20 * damageFlash})`;
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(copy.hintReach, VIEWPORT_W / 2, VIEWPORT_H - 22);

  ctx.restore();
}

export default function GameCanvas({ frame, state, language }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sprites = useMemo(() => {
    const makeImage = (src: string) => {
      const image = new Image();
      image.src = src;
      return image;
    };
    return {
      down: makeImage(heroDown),
      up: makeImage(heroUp),
      left: makeImage(heroLeft),
      right: makeImage(heroRight)
    };
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
    renderState(ctx, state, language, sprites as Record<string, HTMLImageElement | null>);
  }, [frame, language, state, sprites]);

  return <canvas ref={canvasRef} className="game-canvas" width={VIEWPORT_W} height={VIEWPORT_H} />;
}
