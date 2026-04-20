# Game of Life Studio

Game of Life Studio is a React + TypeScript app for composing, previewing, and exporting stylized cellular automata scenes as GIFs.

![Game of Life Studio preview](./game-of-life.gif)

## Repo Layout

```text
.
|-- README.md
|-- docs/
|   `-- frontend-architecture.md
`-- web/
    |-- README.md
    |-- package.json
    |-- public/
    `-- src/
        |-- App.tsx
        |-- main.tsx
        |-- index.css
        |-- components/ui/
        |-- lib/
        `-- features/studio/
```

## Getting Started

```powershell
cd web
npm install
npm run dev
```

## Useful Commands

```powershell
cd web
npm run lint
npm run build
npm run preview
```

## GitHub Pages

This repo is now set up to publish the React app in `web/` to GitHub Pages through GitHub Actions.

1. Push the repository to GitHub.
2. In GitHub, open `Settings > Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or `master`, or run the `Deploy GitHub Pages` workflow manually.

The Vite base path is detected automatically from the GitHub repository name in Actions, so the site will load correctly from `https://<your-user>.github.io/<repo-name>/`.

## Where To Look First

- `web/README.md`: day-to-day frontend workspace guide
- `docs/frontend-architecture.md`: module-level architecture and responsibilities
- `web/src/features/studio/GameOfLifeStudioApp.tsx`: main studio screen and interaction wiring

## What Lives Where

- `web/src/features/studio/constants/`: defaults, presets, and glyph data
- `web/src/features/studio/lib/`: simulation, rendering, export, and styling helpers
- `web/src/features/studio/components/`: small reusable studio-only UI primitives
- `web/src/components/ui/`: shared Radix/shadcn-style UI building blocks

## Project Structure

The application lives in `web/`, with supporting documentation in `docs/`.
