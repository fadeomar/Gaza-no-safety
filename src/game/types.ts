export type Language = 'en' | 'ar';
export type ScreenState = 'menu' | 'playing' | 'paused' | 'between-levels' | 'gameover' | 'victory';
export type Direction = 'up' | 'down' | 'left' | 'right';

export type Wall = { x: number; y: number; width: number; height: number };
export type Hazard = { x: number; y: number; radius: number; pulseSpeed: number; phase?: number };
export type Drone = {
  x: number;
  y: number;
  r: number;
  minX: number;
  maxX: number;
  speed: number;
  dir?: 1 | -1;
};
export type SafeZone = { x: number; y: number; radius: number };

export type LevelDefinition = {
  id: number;
  name: string;
  worldWidth: number;
  worldHeight: number;
  drainRate: number;
  damageRate: number;
  fogAlpha: number;
  discoveryRadius: number;
  spawn: { x: number; y: number };
  safeZone: SafeZone;
  walls: Wall[];
  hazards: Hazard[];
  drones: Drone[];
};

export type LevelRuntime = LevelDefinition & {
  hazards: Hazard[];
  drones: Drone[];
};

export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Player = {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  baseSpeed: number;
  sprintSpeed: number;
  facing: Direction;
  walkTime: number;
  isMoving: boolean;
  isSprinting: boolean;
};

export type GameState = {
  levelIndex: number;
  level: LevelRuntime;
  camera: Camera;
  player: Player;
  timeAlive: number;
  safeDiscovered: boolean;
  damageFlash: number;
  screenShake: number;
  hintStrength: number;
};

export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
};

export type UiState = {
  levelName: string;
  levelNumber: number;
  health: number;
  stamina: number;
  timeAlive: number;
  objective: string;
  status: string;
  progress: number;
};
