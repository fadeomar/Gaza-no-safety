# Run to Safety V3

A React + TypeScript + Vite survival game prototype focused on a more professional player-facing experience.

## What changed in V3

- Real world larger than the visible viewport
- Camera follows the player and stays clamped to the world bounds
- In-game HUD is fixed inside the game screen
- Developer notes were removed from the player UI
- The player is now rendered as a living directional character instead of a white circle
- Arabic and English UI toggle included

## Main file paths

- `src/App.tsx`
- `src/components/GameCanvas.tsx`
- `src/components/InGameHud.tsx`
- `src/components/Overlay.tsx`
- `src/game/engine.ts`
- `src/game/levelData.ts`
- `src/game/initialState.ts`
- `src/game/i18n.ts`
- `src/styles/global.css`

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Production build

```bash
npm run build
npm run preview
```

## Controls

- Move: `W A S D` or Arrow keys
- Sprint: `Shift`
- Pause: `Esc`
- Restart level: `R`

## Notes

For stability in this version, the player character is drawn programmatically on the canvas instead of using an external sprite pipeline. This keeps the project self-contained and easy to test locally.


## v3.1 improvements

- Fixed frame redraw logic so the canvas is no longer remounted every frame
- Added local directional hero SVG assets for up/down/left/right facing
- Simplified the outer layout so the game stage is the clear focus
- Kept HUD fully inside the play area
