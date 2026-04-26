import { PLAYER_RADIUS, VIEWPORT_H, VIEWPORT_W } from './constants';
import { LEVELS } from './levelData';
import type { GameState, Player } from './types';

export function getInitialPlayer(levelIndex = 0): Player {
  const spawn = LEVELS[levelIndex].spawn;
  return {
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER_RADIUS,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    baseSpeed: 190,
    sprintSpeed: 300,
    facing: 'down',
    walkTime: 0,
    isMoving: false,
    isSprinting: false
  };
}

export function createLevelState(index: number): GameState {
  const def = LEVELS[index];
  const player = getInitialPlayer(index);
  return {
    levelIndex: index,
    level: {
      ...def,
      hazards: def.hazards.map((hazard, idx) => ({ ...hazard, phase: idx * 1.3 })),
      drones: def.drones.map((drone, idx) => ({ ...drone, dir: idx % 2 === 0 ? 1 : -1 }))
    },
    camera: {
      x: Math.max(0, Math.min(player.x - VIEWPORT_W / 2, def.worldWidth - VIEWPORT_W)),
      y: Math.max(0, Math.min(player.y - VIEWPORT_H / 2, def.worldHeight - VIEWPORT_H)),
      width: VIEWPORT_W,
      height: VIEWPORT_H
    },
    player,
    timeAlive: 0,
    safeDiscovered: false,
    damageFlash: 0,
    screenShake: 0,
    hintStrength: 0,
    extractionPulse: 0,
    strikes: [],
    strikeCooldown: 3.4,
    ambientPulse: 0
  };
}
