import { WORLD_H, WORLD_W } from './constants';
import type { LevelDefinition } from './types';

export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Broken Street',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    drainRate: 2.25,
    damageRate: 22,
    fogAlpha: 0.12,
    discoveryRadius: 190,
    spawn: { x: 260, y: 235 },
    safeZone: { x: 1530, y: 940, radius: 34 },
    walls: [
      { x: 110, y: 110, width: 240, height: 44 },
      { x: 420, y: 88, width: 48, height: 250 },
      { x: 560, y: 150, width: 280, height: 48 },
      { x: 940, y: 90, width: 44, height: 280 },
      { x: 1120, y: 210, width: 230, height: 42 },
      { x: 170, y: 320, width: 160, height: 200 },
      { x: 410, y: 460, width: 260, height: 42 },
      { x: 760, y: 420, width: 50, height: 280 },
      { x: 990, y: 480, width: 250, height: 40 },
      { x: 1310, y: 420, width: 210, height: 42 },
      { x: 130, y: 720, width: 290, height: 46 },
      { x: 540, y: 780, width: 260, height: 44 },
      { x: 940, y: 780, width: 54, height: 220 },
      { x: 1120, y: 860, width: 220, height: 42 }
    ],
    hazards: [
      { x: 580, y: 290, radius: 72, pulseSpeed: 2.1 },
      { x: 1060, y: 650, radius: 70, pulseSpeed: 2.7 },
      { x: 360, y: 910, radius: 64, pulseSpeed: 2.4 }
    ],
    drones: [{ x: 1240, y: 160, r: 18, minX: 1110, maxX: 1500, speed: 86 }]
  },
  {
    id: 2,
    name: 'Collapsed Homes',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    drainRate: 3,
    damageRate: 28,
    fogAlpha: 0.16,
    discoveryRadius: 165,
    spawn: { x: 160, y: 930 },
    safeZone: { x: 1470, y: 160, radius: 30 },
    walls: [
      { x: 80, y: 100, width: 320, height: 42 },
      { x: 170, y: 200, width: 46, height: 240 },
      { x: 290, y: 240, width: 330, height: 44 },
      { x: 700, y: 120, width: 42, height: 280 },
      { x: 870, y: 110, width: 300, height: 40 },
      { x: 1240, y: 110, width: 48, height: 210 },
      { x: 930, y: 320, width: 180, height: 150 },
      { x: 500, y: 470, width: 320, height: 42 },
      { x: 150, y: 610, width: 260, height: 42 },
      { x: 470, y: 690, width: 46, height: 220 },
      { x: 660, y: 680, width: 360, height: 46 },
      { x: 1140, y: 640, width: 230, height: 44 },
      { x: 1260, y: 810, width: 42, height: 210 }
    ],
    hazards: [
      { x: 800, y: 210, radius: 72, pulseSpeed: 2.6 },
      { x: 1140, y: 550, radius: 66, pulseSpeed: 2.5 },
      { x: 310, y: 840, radius: 62, pulseSpeed: 2.9 },
      { x: 1410, y: 860, radius: 60, pulseSpeed: 2.4 }
    ],
    drones: [
      { x: 510, y: 180, r: 18, minX: 360, maxX: 650, speed: 96 },
      { x: 1480, y: 580, r: 18, minX: 1270, maxX: 1590, speed: 110 }
    ]
  },
  {
    id: 3,
    name: 'Last Crossing',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    drainRate: 3.8,
    damageRate: 34,
    fogAlpha: 0.2,
    discoveryRadius: 150,
    spawn: { x: 240, y: 210 },
    safeZone: { x: 1560, y: 990, radius: 28 },
    walls: [
      { x: 60, y: 120, width: 340, height: 40 },
      { x: 130, y: 220, width: 42, height: 310 },
      { x: 280, y: 245, width: 220, height: 40 },
      { x: 560, y: 130, width: 42, height: 270 },
      { x: 700, y: 220, width: 280, height: 42 },
      { x: 1080, y: 100, width: 44, height: 290 },
      { x: 1260, y: 150, width: 220, height: 44 },
      { x: 380, y: 490, width: 360, height: 44 },
      { x: 820, y: 500, width: 42, height: 240 },
      { x: 980, y: 560, width: 300, height: 40 },
      { x: 1400, y: 420, width: 42, height: 250 },
      { x: 180, y: 760, width: 320, height: 44 },
      { x: 620, y: 860, width: 260, height: 40 },
      { x: 1000, y: 840, width: 320, height: 44 }
    ],
    hazards: [
      { x: 430, y: 360, radius: 72, pulseSpeed: 2.7 },
      { x: 870, y: 340, radius: 74, pulseSpeed: 2.8 },
      { x: 1250, y: 690, radius: 76, pulseSpeed: 3.1 },
      { x: 340, y: 935, radius: 68, pulseSpeed: 2.6 },
      { x: 1490, y: 860, radius: 56, pulseSpeed: 3.2 }
    ],
    drones: [
      { x: 700, y: 170, r: 18, minX: 630, maxX: 980, speed: 116 },
      { x: 1120, y: 470, r: 18, minX: 990, maxX: 1380, speed: 124 },
      { x: 1350, y: 935, r: 18, minX: 1060, maxX: 1590, speed: 130 }
    ]
  }
];
