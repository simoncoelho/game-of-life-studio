# Frontend Architecture

This document is the quickest way to understand how the studio is organized.

## High-Level Flow

1. `src/main.tsx` boots the React app.
2. `src/App.tsx` mounts the studio feature.
3. `src/features/studio/GameOfLifeStudioApp.tsx` owns screen-level state and event handling.
4. Studio helpers in `src/features/studio/lib/` handle simulation, rendering, and export details.
5. Shared UI atoms in `src/components/ui/` support the feature UI.

## Studio Feature Map

### `GameOfLifeStudioApp.tsx`

Owns:

- scene state
- preview state
- viewport pan and zoom state
- stage pointer handling
- wiring controls to helper modules

Does not own:

- preset definitions
- grid stepping algorithms
- text pattern generation
- rendering internals
- GIF encoding internals

### `constants/`

- `defaults.ts`
  Stable starter values such as default grid size and filename.
- `presets.ts`
  Built-in palettes, automaton rules, starter scenes, and paint/stamp tools.
- `font5x7.ts`
  Pixel glyph definitions used for seed text and overlays.

### `lib/`

- `grid-utils.ts`
  Grid creation, cloning, resizing, live-cell counts, snapshots, and simulation stepping.
- `pattern-utils.ts`
  Text-to-grid conversion, pattern scaling, and pattern stamping.
- `render-stage.ts`
  Canvas and WebGL rendering for stage previews.
- `export-gif.ts`
  Browser-side GIF export orchestration.
- `studio-control-styles.ts`
  Shared styling helpers for studio-only controls.

### `components/`

- `StudioControlPrimitives.tsx`
  Small reusable control wrappers used only by the studio feature.

## UI Regions

The studio is easier to reason about if you treat it as three regions:

- Left rail:
  scene setup, colors, capture settings, and export configuration
- Center stage:
  live or preview rendering canvas
- Bottom dock:
  scene tools or preview transport controls depending on the active workflow tab

## Extension Guide

### Add a new preset

Update `src/features/studio/constants/presets.ts`.

### Add a new paint or stamp tool

Update the `tools` array in `src/features/studio/constants/presets.ts`.

### Change how the automaton evolves

Update `nextGridState` in `src/features/studio/lib/grid-utils.ts`.

### Change how the stage looks

Update `src/features/studio/lib/render-stage.ts`.

### Change export output

Update `src/features/studio/lib/export-gif.ts`.

## Design Intent

The structure separates:

- configuration from behavior
- rendering from interaction wiring
- feature-specific code from shared UI code

That keeps the main studio component readable for new contributors while still making low-level behavior easy to find.
