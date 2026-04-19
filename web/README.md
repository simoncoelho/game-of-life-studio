# Frontend Workspace

This folder contains the Game of Life Studio web app.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Source Layout

```text
src/
|-- App.tsx
|-- main.tsx
|-- index.css
|-- components/ui/
|-- lib/
`-- features/studio/
    |-- GameOfLifeStudioApp.tsx
    |-- types.ts
    |-- components/
    |-- constants/
    `-- lib/
```

## Folder Guide

- `src/App.tsx`
  Thin app entry that mounts the studio feature.
- `src/features/studio/GameOfLifeStudioApp.tsx`
  Main screen layout, state orchestration, and user interactions.
- `src/features/studio/constants/`
  Presets, defaults, and text glyph definitions.
- `src/features/studio/lib/`
  Focused helpers for simulation, rendering, GIF export, and styling.
- `src/features/studio/components/`
  Small studio-specific form primitives used by the main app.
- `src/components/ui/`
  Shared UI atoms built on Radix primitives.

## Working Conventions

- Use the `@/` alias for imports from `src/`.
- Put studio-only logic in `src/features/studio/` instead of the shared `src/lib/`.
- Add new presets in `src/features/studio/constants/presets.ts`.
- Add simulation or rendering helpers in `src/features/studio/lib/`.
- Keep `GameOfLifeStudioApp.tsx` focused on wiring state and UI together, not on low-level helper logic.

## Common Edit Paths

- Change scene defaults or starter values:
  `src/features/studio/constants/defaults.ts`
- Change built-in palettes, rules, scenes, or tools:
  `src/features/studio/constants/presets.ts`
- Change Game of Life stepping or grid helpers:
  `src/features/studio/lib/grid-utils.ts`
- Change text stamping behavior:
  `src/features/studio/lib/pattern-utils.ts`
- Change stage rendering:
  `src/features/studio/lib/render-stage.ts`
- Change GIF export behavior:
  `src/features/studio/lib/export-gif.ts`
