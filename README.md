# Game of Life Studio

This project is now centered on a React + TypeScript studio app in [web](C:/Users/Simon/source/conway-game-of-life/web) for building, previewing, and exporting cellular automata motion pieces.

## Web App

The rebuilt UI uses:

- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI primitives in a shadcn-style component layer
- `gifenc` for browser-side GIF export

## Run

```powershell
cd web
npm install
npm run dev
```

## Build

```powershell
cd web
npm run build
```

## Current Studio Flow

- `Scene Setup` for presets, rule tuning, color styling, seed text, and additive scene composition
- `Preview / View` for capturing a timeline and scrubbing or playing it forward and backward
- `Export` for writing the approved preview to GIF with optional seed-text overlay

The legacy Python prototype still exists at the repo root as a reference, but the active app is the React rebuild in `web/`.
