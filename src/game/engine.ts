import { CAMERA_LERP } from './constants';
import type { Direction, GameState, InputState, Player, StrikePattern, StrikeZone, UiState, Wall } from './types';
import { clamp, circleRectCollision, distance } from './utils';

export type TickResult = {
  uiState: UiState;
  dead: boolean;
  reachedSafeZone: boolean;
  finishedGame: boolean;
  tookDamage: boolean;
  discoveredSafeZone: boolean;
  playedStrikeWarning: boolean;
  playedExplosion: boolean;
  lowHealthPulse: boolean;
};

const WARNING_DURATION = 1.25;
const IMPACT_DURATION = 0.38;
const BURN_DURATION = 4.8;
const SPRINT_STAMINA_DRAIN = 17;
const MOVING_STAMINA_REGEN = 5;
const IDLE_STAMINA_REGEN = 10;
const MIN_STAMINA_TO_SPRINT = 16;

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
  const safeTop = camera.safeTop ?? 0;
  const safeBottom = camera.safeBottom ?? 0;
  const safeHeight = Math.max(120, camera.height - safeTop - safeBottom);
  const minY = -safeTop;
  const maxY = Math.max(minY, level.worldHeight - camera.height + safeBottom);
  const targetX = clamp(player.x - camera.width / 2, 0, Math.max(0, level.worldWidth - camera.width));
  const targetY = clamp(player.y - safeTop - safeHeight / 2, minY, maxY);
  const alpha = Math.min(1, dt * CAMERA_LERP);
  camera.x += (targetX - camera.x) * alpha;
  camera.y += (targetY - camera.y) * alpha;
  camera.x = clamp(camera.x, 0, Math.max(0, level.worldWidth - camera.width));
  camera.y = clamp(camera.y, minY, maxY);
}

function strikeIntervalFor(state: GameState) {
  const time = state.timeAlive;
  const base = state.levelIndex === 0 ? 4.2 : state.levelIndex === 1 ? 3.7 : 3.2;
  const min = state.levelIndex === 0 ? 1.7 : state.levelIndex === 1 ? 1.35 : 1.05;
  return Math.max(min, base - time * 0.034);
}

function dangerLevelFor(timeAlive: number): 'low' | 'medium' | 'high' {
  if (timeAlive > 46) return 'high';
  if (timeAlive > 22) return 'medium';
  return 'low';
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function canPlaceStrike(state: GameState, x: number, y: number, radius: number) {
  const { level, player } = state;
  const tooCloseToPlayer = distance(x, y, player.x, player.y) < 132;
  const tooCloseToSafeZone = distance(x, y, level.safeZone.x, level.safeZone.y) < 120;
  const insideWall = level.walls.some((wall) => x > wall.x - radius && x < wall.x + wall.width + radius && y > wall.y - radius && y < wall.y + wall.height + radius);
  const overlapsStrike = state.strikes.some((strike) => distance(x, y, strike.x, strike.y) < radius + strike.radius + 20);
  return !tooCloseToPlayer && !tooCloseToSafeZone && !insideWall && !overlapsStrike;
}

function spawnStrikeAt(state: GameState, x: number, y: number, radius: number, pattern: StrikePattern) {
  if (!canPlaceStrike(state, x, y, radius)) return false;
  state.strikes.push({
    x,
    y,
    radius,
    phase: 'warning',
    timer: WARNING_DURATION,
    age: 0,
    pulse: Math.random() * Math.PI * 2,
    hasImpacted: false,
    pattern
  });
  return true;
}

function spawnSinglePattern(state: GameState) {
  const { level } = state;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const radius = randomBetween(52, 72);
    const x = radius + 40 + Math.random() * (level.worldWidth - radius * 2 - 80);
    const y = radius + 40 + Math.random() * (level.worldHeight - radius * 2 - 80);
    if (spawnStrikeAt(state, x, y, radius, 'single')) return true;
  }
  return false;
}

function spawnClusterPattern(state: GameState) {
  const { level } = state;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const anchorRadius = randomBetween(46, 58);
    const anchorX = 120 + Math.random() * (level.worldWidth - 240);
    const anchorY = 120 + Math.random() * (level.worldHeight - 240);
    const points = [
      [anchorX, anchorY],
      [anchorX + randomBetween(-84, 84), anchorY + randomBetween(-68, 68)],
      [anchorX + randomBetween(-84, 84), anchorY + randomBetween(-68, 68)]
    ];
    if (points.every(([x, y]) => canPlaceStrike(state, x, y, anchorRadius))) {
      points.forEach(([x, y], index) => {
        spawnStrikeAt(state, x, y, anchorRadius - index * 4, 'cluster');
      });
      return true;
    }
  }
  return false;
}

function spawnLinePattern(state: GameState) {
  const { level } = state;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const horizontal = Math.random() > 0.5;
    const radius = randomBetween(46, 56);
    const spacing = radius * 1.9;
    const startX = 150 + Math.random() * (level.worldWidth - 300);
    const startY = 150 + Math.random() * (level.worldHeight - 300);
    const points = [0, 1, 2].map((step) => horizontal ? [startX + step * spacing, startY] : [startX, startY + step * spacing]);
    if (points.every(([x, y]) => x > 70 && y > 70 && x < level.worldWidth - 70 && y < level.worldHeight - 70 && canPlaceStrike(state, x, y, radius))) {
      points.forEach(([x, y]) => spawnStrikeAt(state, x, y, radius, 'line'));
      return true;
    }
  }
  return false;
}

function trySpawnPattern(state: GameState) {
  const danger = dangerLevelFor(state.timeAlive);
  const roll = Math.random();
  if (danger === 'high') {
    if (roll < 0.38 && spawnClusterPattern(state)) return true;
    if (roll < 0.7 && spawnLinePattern(state)) return true;
    return spawnSinglePattern(state);
  }
  if (danger === 'medium') {
    if (roll < 0.26 && spawnClusterPattern(state)) return true;
    if (roll < 0.44 && spawnLinePattern(state)) return true;
    return spawnSinglePattern(state);
  }
  return spawnSinglePattern(state);
}

function updateStrikes(state: GameState, dt: number) {
  const { player, level } = state;
  let tookDamage = false;
  let playedStrikeWarning = false;
  let playedExplosion = false;

  state.strikeCooldown -= dt;
  if (state.strikeCooldown <= 0) {
    if (trySpawnPattern(state)) playedStrikeWarning = true;
    state.strikeCooldown = strikeIntervalFor(state);
  }

  state.strikes = state.strikes.filter((strike) => {
    strike.age += dt;
    strike.pulse += dt * 5;
    strike.timer -= dt;

    if (strike.phase === 'warning' && strike.timer <= 0) {
      strike.phase = 'impact';
      strike.timer = IMPACT_DURATION;
      strike.hasImpacted = true;
      playedExplosion = true;
      state.screenShake = Math.min(14, state.screenShake + (strike.pattern === 'cluster' ? 2.8 : 3.4));
      state.damageFlash = 1;
      if (distance(player.x, player.y, strike.x, strike.y) < strike.radius + player.radius) {
        player.health -= level.damageRate * (strike.pattern === 'line' ? 1.55 : 1.85);
        tookDamage = true;
      }
    } else if (strike.phase === 'impact' && strike.timer <= 0) {
      strike.phase = 'burning';
      strike.timer = BURN_DURATION + (strike.pattern === 'cluster' ? 1.2 : 0);
    } else if (strike.phase === 'burning' && strike.timer <= 0) {
      return false;
    }

    if (strike.phase === 'burning') {
      const burnRadius = strike.radius * (strike.pattern === 'line' ? 0.7 : 0.78);
      if (distance(player.x, player.y, strike.x, strike.y) < burnRadius + player.radius) {
        player.health -= level.damageRate * 0.42 * dt;
        tookDamage = true;
        state.damageFlash = Math.max(state.damageFlash, 0.45);
      }
    }

    return true;
  });

  return { tookDamage, playedStrikeWarning, playedExplosion };
}

export function createUiState(
  state: GameState,
  totalLevels: number,
  labels: {
    objectiveSearch: string;
    objectiveReach: string;
    statusScanning: string;
    statusDanger: string;
    statusSprint: string;
    statusOutOfBreath: string;
    statusLocked: string;
    statusIncoming: string;
    levelNames: readonly string[];
  },
  statusOverride?: string
): UiState {
  const { player, safeDiscovered, timeAlive, levelIndex, strikeCooldown } = state;
  return {
    levelName: labels.levelNames[levelIndex] ?? state.level.name,
    levelNumber: levelIndex + 1,
    health: player.health,
    stamina: player.stamina,
    timeAlive,
    objective: safeDiscovered ? labels.objectiveReach : labels.objectiveSearch,
    status: statusOverride ?? (safeDiscovered ? labels.statusLocked : labels.statusScanning),
    progress: ((levelIndex + (safeDiscovered ? 0.78 : 0.28)) / totalLevels) * 100,
    nextStrike: Math.max(0, strikeCooldown),
    dangerLevel: dangerLevelFor(timeAlive)
  };
}

export function updateGame(
  state: GameState,
  keys: InputState,
  totalLevels: number,
  labels: {
    objectiveSearch: string;
    objectiveReach: string;
    statusScanning: string;
    statusDanger: string;
    statusSprint: string;
    statusOutOfBreath: string;
    statusLocked: string;
    statusIncoming: string;
    levelNames: readonly string[];
  },
  dt: number
): TickResult {
  const { level, player } = state;
  state.timeAlive += dt;
  state.damageFlash = Math.max(0, state.damageFlash - dt * 2.5);
  state.screenShake = Math.max(0, state.screenShake - dt * 14.5);
  state.hintStrength = Math.max(0, state.hintStrength - dt * 0.45);
  state.ambientPulse += dt;
  state.extractionPulse += dt;

  let dx = 0;
  let dy = 0;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;

  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  }
  player.facing = getFacing(dx, dy, player.facing);
  player.isMoving = moving;

  let isSprinting = false;
  if (moving && keys.sprint && player.stamina > MIN_STAMINA_TO_SPRINT) {
    isSprinting = true;
    player.stamina = Math.max(0, player.stamina - SPRINT_STAMINA_DRAIN * dt);
  } else {
    const regenRate = moving ? MOVING_STAMINA_REGEN : IDLE_STAMINA_REGEN;
    player.stamina = Math.min(player.maxStamina, player.stamina + regenRate * dt);
  }
  player.isSprinting = isSprinting;

  if (moving) {
    const speed = isSprinting ? player.sprintSpeed : player.baseSpeed;
    movePlayer(player, level.walls, level.worldWidth, level.worldHeight, dx * speed * dt, dy * speed * dt);
    player.walkTime += dt * (isSprinting ? 8.8 : 6.1);
  }

  player.health -= level.drainRate * dt;

  let inDanger = false;
  let tookDamage = false;
  for (const hazard of level.hazards) {
    hazard.phase = (hazard.phase ?? 0) + dt * hazard.pulseSpeed;
    const activeRadius = hazard.radius + Math.sin(hazard.phase) * 4;
    if (distance(player.x, player.y, hazard.x, hazard.y) < activeRadius + player.radius) {
      inDanger = true;
      tookDamage = true;
      player.health -= level.damageRate * 0.24 * dt;
      state.damageFlash = Math.max(0.35, state.damageFlash);
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
      player.health -= (level.damageRate + 8) * dt;
      state.damageFlash = 1;
      state.screenShake = Math.min(12, state.screenShake + 1);
    }
  }

  const strikeResult = updateStrikes(state, dt);
  if (strikeResult.tookDamage) {
    inDanger = true;
    tookDamage = true;
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

  const incomingWarning = state.strikes.some((strike) => strike.phase === 'warning' && distance(player.x, player.y, strike.x, strike.y) < strike.radius + 120);
  const status = inDanger
    ? labels.statusDanger
    : incomingWarning
      ? labels.statusIncoming
      : isSprinting
        ? labels.statusSprint
        : moving && keys.sprint && player.stamina <= MIN_STAMINA_TO_SPRINT
          ? labels.statusOutOfBreath
          : state.safeDiscovered
            ? labels.statusLocked
            : labels.statusScanning;

  return {
    uiState: createUiState(state, totalLevels, labels, status),
    dead,
    reachedSafeZone,
    finishedGame: reachedSafeZone && state.levelIndex === totalLevels - 1,
    tookDamage,
    discoveredSafeZone,
    playedStrikeWarning: strikeResult.playedStrikeWarning,
    playedExplosion: strikeResult.playedExplosion,
    lowHealthPulse: player.health < 28
  };
}
