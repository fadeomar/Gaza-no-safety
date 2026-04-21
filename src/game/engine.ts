import { CAMERA_LERP, VIEWPORT_H, VIEWPORT_W } from './constants';
import type { Direction, GameState, InputState, Player, UiState, Wall } from './types';
import { clamp, circleRectCollision, distance } from './utils';

export type TickResult = {
  uiState: UiState;
  dead: boolean;
  reachedSafeZone: boolean;
  finishedGame: boolean;
  tookDamage: boolean;
  discoveredSafeZone: boolean;
};

function movePlayer(player: Player, walls: Wall[], worldWidth: number, worldHeight: number, dx: number, dy: number) {
  player.x += dx;
  for (const wall of walls) {
    if (circleRectCollision(player, wall)) {
      player.x -= dx;
      break;
    }
  }

  player.y += dy;
  for (const wall of walls) {
    if (circleRectCollision(player, wall)) {
      player.y -= dy;
      break;
    }
  }

  player.x = clamp(player.x, player.radius, worldWidth - player.radius);
  player.y = clamp(player.y, player.radius, worldHeight - player.radius);
}

function getFacing(dx: number, dy: number, current: Direction): Direction {
  if (dx === 0 && dy === 0) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function updateCamera(state: GameState, dt: number) {
  const { camera, player, level } = state;
  const targetX = clamp(player.x - camera.width / 2, 0, Math.max(0, level.worldWidth - camera.width));
  const targetY = clamp(player.y - camera.height / 2, 0, Math.max(0, level.worldHeight - camera.height));
  const alpha = Math.min(1, dt * CAMERA_LERP);
  camera.x += (targetX - camera.x) * alpha;
  camera.y += (targetY - camera.y) * alpha;
  camera.x = clamp(camera.x, 0, Math.max(0, level.worldWidth - camera.width));
  camera.y = clamp(camera.y, 0, Math.max(0, level.worldHeight - camera.height));
}

export function createUiState(
  state: GameState,
  totalLevels: number,
  labels: { objectiveSearch: string; objectiveReach: string; statusScanning: string; statusDanger: string; statusSprint: string; statusLocked: string; levelNames: readonly string[] },
  statusOverride?: string
): UiState {
  const { player, safeDiscovered, timeAlive, levelIndex } = state;
  return {
    levelName: labels.levelNames[levelIndex] ?? state.level.name,
    levelNumber: levelIndex + 1,
    health: player.health,
    stamina: player.stamina,
    timeAlive,
    objective: safeDiscovered ? labels.objectiveReach : labels.objectiveSearch,
    status: statusOverride ?? (safeDiscovered ? labels.statusLocked : labels.statusScanning),
    progress: ((levelIndex + (safeDiscovered ? 0.75 : 0.24)) / totalLevels) * 100
  };
}

export function updateGame(
  state: GameState,
  keys: InputState,
  totalLevels: number,
  labels: { objectiveSearch: string; objectiveReach: string; statusScanning: string; statusDanger: string; statusSprint: string; statusLocked: string; levelNames: readonly string[] },
  dt: number
): TickResult {
  const { level, player } = state;
  state.timeAlive += dt;
  state.damageFlash = Math.max(0, state.damageFlash - dt * 2.5);
  state.screenShake = Math.max(0, state.screenShake - dt * 15);
  state.hintStrength = Math.max(0, state.hintStrength - dt * 0.45);

  let dx = 0;
  let dy = 0;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;

  const moving = dx !== 0 || dy !== 0;
  player.isMoving = moving;

  if (moving) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  }

  player.facing = getFacing(dx, dy, player.facing);

  let isSprinting = false;
  if (moving && keys.sprint && player.stamina > 8) {
    isSprinting = true;
    player.stamina = Math.max(0, player.stamina - 34 * dt);
  } else {
    player.stamina = Math.min(player.maxStamina, player.stamina + (moving ? 18 : 26) * dt);
  }
  player.isSprinting = isSprinting;

  if (moving) {
    const speed = isSprinting ? player.sprintSpeed : player.baseSpeed;
    movePlayer(player, level.walls, level.worldWidth, level.worldHeight, dx * speed * dt, dy * speed * dt);
    player.walkTime += dt * (isSprinting ? 9 : 6.2);
  }

  player.health -= level.drainRate * dt;

  let inDanger = false;
  let tookDamage = false;
  for (const hazard of level.hazards) {
    hazard.phase = (hazard.phase ?? 0) + dt * hazard.pulseSpeed;
    const activeRadius = hazard.radius + Math.sin(hazard.phase) * 8;
    if (distance(player.x, player.y, hazard.x, hazard.y) < activeRadius + player.radius) {
      inDanger = true;
      tookDamage = true;
      player.health -= level.damageRate * dt;
      state.damageFlash = 1;
      state.screenShake = Math.min(11, state.screenShake + 0.85);
    }
  }

  for (const drone of level.drones) {
    drone.x += drone.speed * (drone.dir ?? 1) * dt;
    if (drone.x <= drone.minX || drone.x >= drone.maxX) {
      drone.dir = ((drone.dir ?? 1) * -1) as 1 | -1;
      drone.x = clamp(drone.x, drone.minX, drone.maxX);
    }

    const hit = distance(player.x, player.y, drone.x, drone.y) < drone.r + player.radius + 6;
    if (hit) {
      inDanger = true;
      tookDamage = true;
      player.health -= (level.damageRate + 10) * dt;
      state.damageFlash = 1;
      state.screenShake = Math.min(12, state.screenShake + 1);
    }
  }

  const safeDistance = distance(player.x, player.y, level.safeZone.x, level.safeZone.y);
  let discoveredSafeZone = false;
  if (!state.safeDiscovered && safeDistance < level.discoveryRadius) {
    state.safeDiscovered = true;
    state.hintStrength = 1;
    discoveredSafeZone = true;
  }

  updateCamera(state, dt);

  const reachedSafeZone = safeDistance < level.safeZone.radius + player.radius;
  const dead = player.health <= 0;
  if (dead) player.health = 0;

  const status = inDanger
    ? labels.statusDanger
    : isSprinting
      ? labels.statusSprint
      : state.safeDiscovered
        ? labels.statusLocked
        : labels.statusScanning;

  return {
    uiState: createUiState(state, totalLevels, labels, status),
    dead,
    reachedSafeZone,
    finishedGame: reachedSafeZone && state.levelIndex === totalLevels - 1,
    tookDamage,
    discoveredSafeZone
  };
}
