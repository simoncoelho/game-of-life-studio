import { useEffect, useMemo, useRef, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  BrushCleaning,
  Captions,
  ChevronLeft,
  ChevronRight,
  Circle,
  Diamond,
  Download,
  Grid3X3,
  Minus,
  Move,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  StepBack,
  StepForward,
  Wand2,
} from "lucide-react"
import { GIFEncoder, applyPalette, quantize } from "gifenc"

import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Slider } from "./components/ui/slider"
import { Switch } from "./components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip"
import { cn } from "./lib/utils"

type Snapshot = {
  grid: number[][]
  previousGrid: number[][]
  generation: number
  liveCells: number
}

type Palette = {
  key: string
  label: string
  background: string
  cell: string
  grid: string
  trail: string
}

type ScenePreset = {
  key: string
  label: string
  description: string
  ruleKey: string
  paletteKey: string
  density: number
  speed: number
  trail: number
  gridContrast: number
  cellSize: number
  showGrid: boolean
}

type RulePreset = {
  key: string
  label: string
  description: string
  birth: number[]
  survive: number[]
  density: number
}

type ToolDefinition = {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  kind: "paint" | "stamp" | "action"
  pattern?: number[][]
}

const palettes: Palette[] = [
  { key: "petri", label: "Petri", background: "#070d0b", cell: "#dfffe4", grid: "#203129", trail: "#143026" },
  { key: "mycelium", label: "Mycelium", background: "#0f1116", cell: "#eee6d0", grid: "#252935", trail: "#433349" },
  { key: "biofilm", label: "Biofilm", background: "#061211", cell: "#95ffbc", grid: "#12332a", trail: "#1d5d47" },
  { key: "ember", label: "Ember", background: "#120b0d", cell: "#ffb080", grid: "#3b262b", trail: "#4f272f" },
  { key: "neon-ice", label: "Neon Ice", background: "#060b14", cell: "#8ce8ff", grid: "#1b2d4f", trail: "#134166" },
  { key: "ultraviolet", label: "Ultraviolet", background: "#0b0714", cell: "#c9a2ff", grid: "#2f2150", trail: "#4d2e7a" },
  { key: "sunset-grid", label: "Sunset Grid", background: "#12080a", cell: "#ff9e8c", grid: "#4c2530", trail: "#7a3444" },
  { key: "acid-lime", label: "Acid Lime", background: "#081006", cell: "#d3ff7a", grid: "#24361c", trail: "#416224" },
  { key: "steel-blue", label: "Steel Blue", background: "#0b1117", cell: "#c9d9ff", grid: "#26384b", trail: "#37506d" },
  { key: "rose-lab", label: "Rose Lab", background: "#120b10", cell: "#ffb7d9", grid: "#45243a", trail: "#6a3452" },
  { key: "paper-mint", label: "Paper Mint", background: "#f3fff7", cell: "#0f553a", grid: "#d8ebe1", trail: "#95bea8" },
  { key: "daylight-blue", label: "Daylight Blue", background: "#f4f8ff", cell: "#3356a6", grid: "#d7e1fb", trail: "#93aae0" },
  { key: "warm-paper", label: "Warm Paper", background: "#fff7ef", cell: "#9a552f", grid: "#efd6c4", trail: "#d9a584" },
  { key: "graphite-paper", label: "Graphite Paper", background: "#f5f4ef", cell: "#23282c", grid: "#d9ddd8", trail: "#acb3ad" },
]

const rules: RulePreset[] = [
  { key: "conway", label: "Conway", description: "Balanced Life with gliders and stable forms.", birth: [3], survive: [2, 3], density: 0.22 },
  { key: "coagulation", label: "Coagulation", description: "Thick colony membranes and clotted growth.", birth: [3, 7, 8], survive: [2, 3, 5, 6, 7, 8], density: 0.35 },
  { key: "serviettes", label: "Serviettes", description: "Lacy explosive branching like fungal fronts.", birth: [2, 3, 4], survive: [], density: 0.08 },
  { key: "maze", label: "Maze", description: "Creases into creeping labyrinths and dense channels.", birth: [3], survive: [1, 2, 3, 4, 5], density: 0.24 },
  { key: "coral", label: "Coral", description: "Porous rim growth and chunky accretion.", birth: [3], survive: [4, 5, 6, 7, 8], density: 0.28 },
]

const scenes: ScenePreset[] = [
  {
    key: "blank-canvas",
    label: "Blank Canvas",
    description: "Classic Conway setup with a clean title stamp ready to animate.",
    ruleKey: "conway",
    paletteKey: "petri",
    density: 0.22,
    speed: 8,
    trail: 0.24,
    gridContrast: 0.08,
    cellSize: 7,
    showGrid: false,
  },
  {
    key: "bacterial-bloom",
    label: "Bacterial Bloom",
    description: "Soft petri dish bloom with pooling edges and thickening fronts.",
    ruleKey: "coagulation",
    paletteKey: "petri",
    density: 0.34,
    speed: 10,
    trail: 0.36,
    gridContrast: 0.08,
    cellSize: 7,
    showGrid: false,
  },
  {
    key: "fungal-mycelium",
    label: "Fungal Mycelium",
    description: "Fine branching strands and spore bursts for a mycelial look.",
    ruleKey: "serviettes",
    paletteKey: "mycelium",
    density: 0.08,
    speed: 7,
    trail: 0.48,
    gridContrast: 0.06,
    cellSize: 6,
    showGrid: false,
  },
  {
    key: "coral-colony",
    label: "Coral Colony",
    description: "Porous growth that reads like coral or mineral accretion.",
    ruleKey: "coral",
    paletteKey: "biofilm",
    density: 0.26,
    speed: 9,
    trail: 0.24,
    gridContrast: 0.06,
    cellSize: 7,
    showGrid: false,
  },
  {
    key: "ember-plate",
    label: "Ember Plate",
    description: "Hot ember trails with dense channels and brighter ridges.",
    ruleKey: "maze",
    paletteKey: "ember",
    density: 0.22,
    speed: 8,
    trail: 0.41,
    gridContrast: 0.12,
    cellSize: 7,
    showGrid: false,
  },
]

const tools: ToolDefinition[] = [
  { key: "brush", label: "Brush", icon: BrushCleaning, kind: "paint", pattern: [[1]] },
  { key: "block", label: "Block", icon: Square, kind: "stamp", pattern: [[1, 1], [1, 1]] },
  { key: "glider", label: "Glider", icon: StepForward, kind: "stamp", pattern: [[0, 1, 0], [0, 0, 1], [1, 1, 1]] },
  { key: "cross", label: "Cross", icon: Sparkles, kind: "stamp", pattern: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
  { key: "diamond", label: "Diamond", icon: Diamond, kind: "stamp", pattern: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
  { key: "exploder", label: "Exploder", icon: Wand2, kind: "stamp", pattern: [[1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1]] },
  { key: "text", label: "Text", icon: Captions, kind: "action" },
  { key: "noise", label: "Noise", icon: Sparkles, kind: "action" },
]

const FONT_5X7: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "00110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "10000", "10000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
}

function createEmptyGrid(rows: number, cols: number) {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(0))
}

function cloneGrid(grid: number[][]) {
  return grid.map((row) => [...row])
}

function randomizeGrid(rows: number, cols: number, density: number) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() < density ? 1 : 0)),
  )
}

function countLive(grid: number[][]) {
  return grid.reduce((sum, row) => sum + row.reduce((inner, cell) => inner + cell, 0), 0)
}

function resizeGrid(grid: number[][], nextRows: number, nextCols: number) {
  const resized = createEmptyGrid(nextRows, nextCols)
  for (let row = 0; row < Math.min(grid.length, nextRows); row += 1) {
    for (let col = 0; col < Math.min(grid[0]?.length ?? 0, nextCols); col += 1) {
      resized[row][col] = grid[row][col]
    }
  }
  return resized
}

function makeSnapshot(grid: number[][], previousGrid: number[][], generation: number): Snapshot {
  return {
    grid: cloneGrid(grid),
    previousGrid: cloneGrid(previousGrid),
    generation,
    liveCells: countLive(grid),
  }
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "")
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((component) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, "0"))
    .join("")}`
}

function blendColors(foreground: string, background: string, alpha: number) {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  return rgbToHex(
    Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  )
}

function hexToRgba(value: string, alpha: number) {
  const { r, g, b } = hexToRgb(value)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

function fillRoundedCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  color: string,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, radius)
  ctx.fillStyle = color
  ctx.fill()
}

function drawGlowingCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  color: string,
  intensity: number,
  cellSize: number,
  glowRadius: number,
) {
  if (intensity <= 0 || size <= 0) return

  const clampedIntensity = Math.max(0, Math.min(1, intensity))
  const radiusScale = Math.max(0.35, glowRadius)
  const outerExpand = Math.max(0.8, cellSize * (0.18 + radiusScale * 0.26))
  const midExpand = Math.max(0.45, cellSize * (0.1 + radiusScale * 0.14))
  const innerInset = Math.max(0.35, cellSize * 0.08)

  fillRoundedCell(
    ctx,
    x - outerExpand,
    y - outerExpand,
    size + outerExpand * 2,
    radius + outerExpand,
    hexToRgba(color, clampedIntensity * 0.12),
  )

  fillRoundedCell(
    ctx,
    x - midExpand,
    y - midExpand,
    size + midExpand * 2,
    radius + midExpand,
    hexToRgba(color, clampedIntensity * 0.22),
  )

  fillRoundedCell(
    ctx,
    x,
    y,
    size,
    radius,
    hexToRgba(color, 0.18 + clampedIntensity * 0.58),
  )

  fillRoundedCell(
    ctx,
    x + innerInset,
    y + innerInset,
    Math.max(0.8, size - innerInset * 2),
    Math.max(1, radius - innerInset * 0.65),
    hexToRgba("#ffffff", clampedIntensity * 0.16),
  )
}

function nextGridState(grid: number[][], birth: number[], survive: number[], wrapEdges: boolean) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const next = createEmptyGrid(rows, cols)
  const birthSet = new Set(birth)
  const surviveSet = new Set(survive)

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let neighbors = 0

      for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
        for (let deltaCol = -1; deltaCol <= 1; deltaCol += 1) {
          if (deltaRow === 0 && deltaCol === 0) continue
          let targetRow = row + deltaRow
          let targetCol = col + deltaCol

          if (wrapEdges) {
            targetRow = (targetRow + rows) % rows
            targetCol = (targetCol + cols) % cols
            neighbors += grid[targetRow][targetCol]
          } else if (targetRow >= 0 && targetRow < rows && targetCol >= 0 && targetCol < cols) {
            neighbors += grid[targetRow][targetCol]
          }
        }
      }

      if (grid[row][col] === 1 && surviveSet.has(neighbors)) next[row][col] = 1
      if (grid[row][col] === 0 && birthSet.has(neighbors)) next[row][col] = 1
    }
  }

  return next
}

function buildTextPattern(message: string, scale: number) {
  const text = message.trim().toUpperCase()
  if (!text) return []

  const lines = text.split(/\r?\n/)
  const charSpacing = Math.max(1, scale)
  const lineSpacing = Math.max(1, scale * 2)
  const rows: number[][] = []

  lines.forEach((line, lineIndex) => {
    const glyphs = [...line].map((character) => FONT_5X7[character] ?? FONT_5X7["?"])
    const width =
      glyphs.reduce((sum, glyph) => sum + glyph[0].length * scale, 0) +
      Math.max(0, glyphs.length - 1) * charSpacing
    const lineRows = Array.from({ length: 7 * scale }, () => Array<number>(width).fill(0))
    let cursor = 0

    glyphs.forEach((glyph) => {
      glyph.forEach((glyphRow, glyphY) => {
        glyphRow.split("").forEach((value, glyphX) => {
          if (value !== "1") return
          for (let sy = 0; sy < scale; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              lineRows[glyphY * scale + sy][cursor + glyphX * scale + sx] = 1
            }
          }
        })
      })
      cursor += glyph[0].length * scale + charSpacing
    })

    rows.push(...lineRows)
    if (lineIndex < lines.length - 1) {
      rows.push(...Array.from({ length: lineSpacing }, () => Array<number>(width).fill(0)))
    }
  })

  const maxWidth = Math.max(...rows.map((row) => row.length))
  return rows.map((row) => [...row, ...Array<number>(maxWidth - row.length).fill(0)])
}

function applyPattern(grid: number[][], pattern: number[][], top: number, left: number) {
  pattern.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!value) return
      const targetRow = top + rowIndex
      const targetCol = left + colIndex
      if (targetRow >= 0 && targetRow < grid.length && targetCol >= 0 && targetCol < grid[0].length) {
        grid[targetRow][targetCol] = 1
      }
    })
  })
}

function scalePattern(pattern: number[][], scale: number) {
  const safeScale = Math.max(1, Math.round(scale))
  if (safeScale === 1) return pattern

  const scaled = Array.from({ length: pattern.length * safeScale }, () =>
    Array<number>((pattern[0]?.length ?? 0) * safeScale).fill(0),
  )

  pattern.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!value) return
      for (let y = 0; y < safeScale; y += 1) {
        for (let x = 0; x < safeScale; x += 1) {
          scaled[rowIndex * safeScale + y][colIndex * safeScale + x] = 1
        }
      }
    })
  })

  return scaled
}

function createSeededTextGrid(rows: number, cols: number, text: string, scale: number, offsetX = 0, offsetY = 0) {
  const grid = createEmptyGrid(rows, cols)
  const pattern = buildTextPattern(text, scale)
  if (!pattern.length) return grid
  const startRow = Math.max(0, Math.floor((rows - pattern.length) / 2 + offsetY))
  const startCol = Math.max(0, Math.floor((cols - pattern[0].length) / 2 + offsetX))
  applyPattern(grid, pattern, startRow, startCol)
  return grid
}

function renderSnapshot2D(
  canvas: HTMLCanvasElement,
  snapshot: Snapshot,
  palette: Palette,
  cellSize: number,
  showGrid: boolean,
  gridContrast: number,
  trailStrength: number,
  bloomAmount: number,
  bloomRadius: number,
  transitionProgress: number,
  renderScale: number,
  overlay?: { enabled: boolean; color: string; opacity: number; pattern: number[][]; offsetX: number; offsetY: number },
) {
  const rows = snapshot.grid.length
  const cols = snapshot.grid[0]?.length ?? 0
  const width = cols * cellSize
  const height = rows * cellSize
  canvas.width = Math.max(1, Math.round(width * renderScale))
  canvas.height = Math.max(1, Math.round(height * renderScale))

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, width, height)

  const gridColor = blendColors(palette.grid, palette.background, gridContrast)
  const overlayColor = overlay ? blendColors(overlay.color, palette.background, overlay.opacity) : palette.cell
  const inset = Math.max(0.45, cellSize * 0.08)
  const chipSize = Math.max(1, cellSize - inset * 2)
  const radius = Math.min(chipSize * 0.4, Math.max(1.6, cellSize * 0.3))
  const pulse = 0.88 + transitionProgress * 0.12
  const bloomScale = Math.max(0, bloomAmount)

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const currentAlive = snapshot.grid[row][col] ? 1 : 0
      const previousAlive = snapshot.previousGrid[row]?.[col] ? 1 : 0
      const liveMix = previousAlive + (currentAlive - previousAlive) * transitionProgress
      const trailMix = previousAlive && !currentAlive ? (1 - transitionProgress) * trailStrength : 0
      if (liveMix <= 0 && trailMix <= 0) continue

      const x = col * cellSize + inset
      const y = row * cellSize + inset

      if (trailMix > 0) {
        drawGlowingCell(ctx, x, y, chipSize, radius, palette.trail, Math.min(0.45, trailMix * 0.85) * bloomScale, cellSize, bloomRadius)
      }

      if (liveMix > 0) {
        const scaledSize = chipSize * pulse
        const offset = (chipSize - scaledSize) / 2
        drawGlowingCell(ctx, x + offset, y + offset, scaledSize, radius, palette.cell, Math.min(1, 0.1 + liveMix * 0.96) * bloomScale, cellSize, bloomRadius)
      }
    }
  }

  if (overlay?.enabled && overlay.pattern.length > 0) {
    const startRow = Math.max(0, Math.floor((rows - overlay.pattern.length) / 2 + overlay.offsetY))
    const startCol = Math.max(0, Math.floor((cols - overlay.pattern[0].length) / 2 + overlay.offsetX))
    ctx.fillStyle = overlayColor
    overlay.pattern.forEach((patternRow, rowIndex) => {
      patternRow.forEach((value, colIndex) => {
        if (!value) return
        const gridRow = startRow + rowIndex
        const gridCol = startCol + colIndex
        if (gridRow < rows && gridCol < cols) {
          fillRoundedCell(
            ctx,
            gridCol * cellSize + inset,
            gridRow * cellSize + inset,
            chipSize,
            radius,
            overlayColor,
          )
        }
      })
    })
  }

  if (showGrid && cellSize >= 6 && gridContrast > 0) {
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= width; x += cellSize) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
    }
    for (let y = 0; y <= height; y += cellSize) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
    }
    ctx.stroke()
  }
}

function toolButtonClass(active: boolean) {
  return cn(
    "group flex min-w-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition-all",
    active
      ? "border-primary/60 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
      : "border-border bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
  )
}

type StageWebGLRenderer = {
  gl: WebGLRenderingContext
  backgroundProgram: WebGLProgram
  pointsProgram: WebGLProgram
  quadBuffer: WebGLBuffer
  pointBuffer: WebGLBuffer
  backgroundPositionLocation: number
  backgroundResolutionLocation: WebGLUniformLocation
  backgroundColorLocation: WebGLUniformLocation
  backgroundGridColorLocation: WebGLUniformLocation
  backgroundCellSizeLocation: WebGLUniformLocation
  backgroundGridStrengthLocation: WebGLUniformLocation
  pointPositionLocation: number
  pointSizeLocation: number
  pointColorLocation: number
  pointGlowLocation: number
  pointCoreScaleLocation: WebGLUniformLocation
  pointResolutionLocation: WebGLUniformLocation
}

const stageRendererCache = new WeakMap<HTMLCanvasElement, StageWebGLRenderer>()

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Unable to create shader")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(info || "Shader compilation failed")
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error("Unable to create program")
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(info || "Program link failed")
  }
  return program
}

function getStageRenderer(canvas: HTMLCanvasElement) {
  const cached = stageRendererCache.get(canvas)
  if (cached) return cached

  const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  })
  if (!gl) return null

  const backgroundProgram = createProgram(
    gl,
    `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `,
    `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform vec4 u_background;
      uniform vec4 u_grid;
      uniform float u_cell_size;
      uniform float u_grid_strength;
      void main() {
        vec3 color = u_background.rgb;
        if (u_grid_strength > 0.0 && u_cell_size >= 6.0) {
          float x = mod(gl_FragCoord.x, u_cell_size);
          float y = mod(gl_FragCoord.y, u_cell_size);
          float edgeX = min(x, u_cell_size - x);
          float edgeY = min(y, u_cell_size - y);
          float line = max(1.0 - smoothstep(0.0, 1.1, edgeX), 1.0 - smoothstep(0.0, 1.1, edgeY));
          color = mix(color, u_grid.rgb, line * u_grid_strength);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  )

  const pointsProgram = createProgram(
    gl,
    `
      attribute vec2 a_center;
      attribute float a_size;
      attribute vec4 a_color;
      attribute vec4 a_glow;
      uniform vec2 u_resolution;
      uniform float u_core_scale;
      varying vec4 v_color;
      varying vec4 v_glow;
      varying float v_core_scale;
      void main() {
        vec2 clip = (a_center / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        gl_PointSize = a_size;
        v_color = a_color;
        v_glow = a_glow;
        v_core_scale = u_core_scale;
      }
    `,
    `
      precision mediump float;
      varying vec4 v_color;
      varying vec4 v_glow;
      varying float v_core_scale;

      float roundedBoxSdf(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + vec2(r);
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        vec2 coreUv = uv * v_core_scale;
        float dist = roundedBoxSdf(coreUv, vec2(0.58), 0.28);
        float core = 1.0 - smoothstep(0.0, 0.035, dist);
        float coreHighlight = 1.0 - smoothstep(-0.24, 0.4, length(coreUv + vec2(-0.18, -0.18)));
        float radial = length(uv);
        float outsideMask = smoothstep(0.02, 0.22, dist);
        float halo = exp(-2.1 * radial * radial) * outsideMask;
        float farHalo = exp(-0.85 * radial * radial) * outsideMask;
        vec3 color = v_glow.rgb * halo * v_glow.a * 1.55;
        color += v_glow.rgb * farHalo * v_glow.a * 0.5;
        color += v_color.rgb * v_color.a * core;
        color += vec3(1.0) * 0.06 * coreHighlight * v_color.a * core;
        float alpha = max(core * v_color.a, max(halo * v_glow.a * 0.86, farHalo * v_glow.a * 0.36));
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  )

  const quadBuffer = gl.createBuffer()
  const pointBuffer = gl.createBuffer()
  if (!quadBuffer || !pointBuffer) return null

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )

  const renderer: StageWebGLRenderer = {
    gl,
    backgroundProgram,
    pointsProgram,
    quadBuffer,
    pointBuffer,
    backgroundPositionLocation: gl.getAttribLocation(backgroundProgram, "a_position"),
    backgroundResolutionLocation: gl.getUniformLocation(backgroundProgram, "u_resolution")!,
    backgroundColorLocation: gl.getUniformLocation(backgroundProgram, "u_background")!,
    backgroundGridColorLocation: gl.getUniformLocation(backgroundProgram, "u_grid")!,
    backgroundCellSizeLocation: gl.getUniformLocation(backgroundProgram, "u_cell_size")!,
    backgroundGridStrengthLocation: gl.getUniformLocation(backgroundProgram, "u_grid_strength")!,
    pointPositionLocation: gl.getAttribLocation(pointsProgram, "a_center"),
    pointSizeLocation: gl.getAttribLocation(pointsProgram, "a_size"),
    pointColorLocation: gl.getAttribLocation(pointsProgram, "a_color"),
    pointGlowLocation: gl.getAttribLocation(pointsProgram, "a_glow"),
    pointCoreScaleLocation: gl.getUniformLocation(pointsProgram, "u_core_scale")!,
    pointResolutionLocation: gl.getUniformLocation(pointsProgram, "u_resolution")!,
  }

  stageRendererCache.set(canvas, renderer)
  return renderer
}

function renderStageWebGL(
  canvas: HTMLCanvasElement,
  snapshot: Snapshot,
  palette: Palette,
  cellSize: number,
  showGrid: boolean,
  gridContrast: number,
  trailStrength: number,
  bloomAmount: number,
  bloomRadius: number,
  transitionProgress: number,
  renderScale: number,
  overlay?: { enabled: boolean; color: string; opacity: number; pattern: number[][]; offsetX: number; offsetY: number },
) {
  const renderer = getStageRenderer(canvas)
  if (!renderer) {
    renderSnapshot2D(
      canvas,
      snapshot,
      palette,
      cellSize,
      showGrid,
        gridContrast,
        trailStrength,
        bloomAmount,
        bloomRadius,
        transitionProgress,
      renderScale,
      overlay,
    )
    return
  }

  const { gl } = renderer
  const rows = snapshot.grid.length
  const cols = snapshot.grid[0]?.length ?? 0
  const width = cols * cellSize
  const height = rows * cellSize
  const deviceWidth = Math.max(1, Math.round(width * renderScale))
  const deviceHeight = Math.max(1, Math.round(height * renderScale))
  canvas.width = deviceWidth
  canvas.height = deviceHeight

  gl.viewport(0, 0, deviceWidth, deviceHeight)
  gl.disable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const bg = hexToRgb(palette.background)
  const gridRgb = hexToRgb(blendColors(palette.grid, palette.background, gridContrast))

  gl.useProgram(renderer.backgroundProgram)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quadBuffer)
  gl.enableVertexAttribArray(renderer.backgroundPositionLocation)
  gl.vertexAttribPointer(renderer.backgroundPositionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(renderer.backgroundResolutionLocation, deviceWidth, deviceHeight)
  gl.uniform4f(renderer.backgroundColorLocation, bg.r / 255, bg.g / 255, bg.b / 255, 1)
  gl.uniform4f(renderer.backgroundGridColorLocation, gridRgb.r / 255, gridRgb.g / 255, gridRgb.b / 255, 1)
  gl.uniform1f(renderer.backgroundCellSizeLocation, cellSize * renderScale)
  gl.uniform1f(renderer.backgroundGridStrengthLocation, showGrid && cellSize >= 6 ? Math.max(0, Math.min(1, gridContrast * 1.65)) : 0)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  const cellRgb = hexToRgb(palette.cell)
  const trailRgb = hexToRgb(palette.trail)
  const overlayRgb = overlay ? hexToRgb(blendColors(overlay.color, palette.background, overlay.opacity)) : cellRgb
  const basePointSize = Math.max(1.5, cellSize * renderScale * 1.04)
  const haloPadding = Math.max(0.4, bloomRadius) * Math.max(1.35, cellSize * renderScale * 0.26)
  const pointSize = basePointSize + haloPadding * 2
  const coreScale = pointSize / basePointSize
  const bloomScale = Math.max(0, bloomAmount)
  const liveGlowAlphaBase = (0.34 + 0.24 * Math.min(1, cellSize / 14)) * bloomScale
  const trailGlowAlphaBase = (0.18 + 0.12 * Math.min(1, cellSize / 14)) * bloomScale
  const pulse = 0.9 + transitionProgress * 0.1
  const data: number[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const currentAlive = snapshot.grid[row][col] ? 1 : 0
      const previousAlive = snapshot.previousGrid[row]?.[col] ? 1 : 0
      const liveMix = previousAlive + (currentAlive - previousAlive) * transitionProgress
      const trailMix = previousAlive && !currentAlive ? (1 - transitionProgress) * trailStrength : 0
      const cx = (col + 0.5) * cellSize * renderScale
      const cy = (row + 0.5) * cellSize * renderScale

      if (trailMix > 0) {
        data.push(
          cx,
          cy,
          pointSize,
          trailRgb.r / 255,
          trailRgb.g / 255,
          trailRgb.b / 255,
          Math.min(0.55, trailMix * 0.72),
          trailRgb.r / 255,
          trailRgb.g / 255,
          trailRgb.b / 255,
          trailGlowAlphaBase * trailMix,
        )
      }

      if (liveMix > 0) {
        data.push(
          cx,
          cy,
          pointSize * pulse,
          cellRgb.r / 255,
          cellRgb.g / 255,
          cellRgb.b / 255,
          Math.min(1, 0.22 + liveMix * 0.92),
          cellRgb.r / 255,
          cellRgb.g / 255,
          cellRgb.b / 255,
          liveGlowAlphaBase * Math.min(1, liveMix),
        )
      }
    }
  }

  if (overlay?.enabled && overlay.pattern.length > 0) {
    const startRow = Math.max(0, Math.floor((rows - overlay.pattern.length) / 2 + overlay.offsetY))
    const startCol = Math.max(0, Math.floor((cols - overlay.pattern[0].length) / 2 + overlay.offsetX))
    overlay.pattern.forEach((patternRow, rowIndex) => {
      patternRow.forEach((value, colIndex) => {
        if (!value) return
        const gridRow = startRow + rowIndex
        const gridCol = startCol + colIndex
        if (gridRow >= rows || gridCol >= cols) return
        data.push(
          (gridCol + 0.5) * cellSize * renderScale,
          (gridRow + 0.5) * cellSize * renderScale,
          pointSize,
          overlayRgb.r / 255,
          overlayRgb.g / 255,
          overlayRgb.b / 255,
          Math.min(1, overlay.opacity),
          overlayRgb.r / 255,
          overlayRgb.g / 255,
          overlayRgb.b / 255,
          0.18 * Math.min(1, overlay.opacity),
        )
      })
    })
  }

  gl.useProgram(renderer.pointsProgram)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.pointBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW)
  const stride = 11 * Float32Array.BYTES_PER_ELEMENT

  gl.enableVertexAttribArray(renderer.pointPositionLocation)
  gl.vertexAttribPointer(renderer.pointPositionLocation, 2, gl.FLOAT, false, stride, 0)

  gl.enableVertexAttribArray(renderer.pointSizeLocation)
  gl.vertexAttribPointer(renderer.pointSizeLocation, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT)

  gl.enableVertexAttribArray(renderer.pointColorLocation)
  gl.vertexAttribPointer(renderer.pointColorLocation, 4, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT)

  gl.enableVertexAttribArray(renderer.pointGlowLocation)
  gl.vertexAttribPointer(renderer.pointGlowLocation, 4, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT)

  gl.uniform2f(renderer.pointResolutionLocation, deviceWidth, deviceHeight)
  gl.uniform1f(renderer.pointCoreScaleLocation, coreScale)
  gl.drawArrays(gl.POINTS, 0, data.length / 11)
}

function App() {
  const defaultRows = 150
  const defaultCols = 200
  const defaultTextSeed = "GAME OF LIFE"
  const defaultTextScale = 2
  const defaultScene = scenes[0]
  const defaultRule = rules.find((rule) => rule.key === defaultScene.ruleKey) ?? rules[0]
  const defaultPalette = palettes.find((palette) => palette.key === defaultScene.paletteKey) ?? palettes[0]
  const initialGrid =
    defaultScene.key === "blank-canvas"
      ? createSeededTextGrid(defaultRows, defaultCols, defaultTextSeed, defaultTextScale)
      : randomizeGrid(defaultRows, defaultCols, defaultScene.density)

  const [workflowTab, setWorkflowTab] = useState<"scene" | "review">("scene")
  const [sceneTab, setSceneTab] = useState("scene")

  const [sceneKey, setSceneKey] = useState(defaultScene.key)
  const [paletteKey, setPaletteKey] = useState(defaultPalette.key)
  const [ruleKey, setRuleKey] = useState(defaultRule.key)
  const [birthText, setBirthText] = useState(defaultRule.birth.join(""))
  const [surviveText, setSurviveText] = useState(defaultRule.survive.join(""))
  const [rows, setRows] = useState(defaultRows)
  const [cols, setCols] = useState(defaultCols)
  const [cellSize, setCellSize] = useState(defaultScene.cellSize)
  const [density, setDensity] = useState(defaultScene.density)
  const [speed, setSpeed] = useState(defaultScene.speed)
  const [trailStrength, setTrailStrength] = useState(defaultScene.trail)
  const [bloomAmount, setBloomAmount] = useState(1)
  const [bloomRadius, setBloomRadius] = useState(1.2)
  const [gridContrast, setGridContrast] = useState(defaultScene.gridContrast)
  const [wrapEdges, setWrapEdges] = useState(true)
  const [showGrid, setShowGrid] = useState(defaultScene.showGrid)
  const [backgroundColor, setBackgroundColor] = useState(defaultPalette.background)
  const [cellColor, setCellColor] = useState(defaultPalette.cell)
  const [gridColor, setGridColor] = useState(defaultPalette.grid)
  const [trailColor, setTrailColor] = useState(defaultPalette.trail)
  const [textSeed, setTextSeed] = useState(defaultTextSeed)
  const [textScale, setTextScale] = useState(defaultTextScale)
  const [textOffsetX, setTextOffsetX] = useState(0)
  const [textOffsetY, setTextOffsetY] = useState(0)
  const [noiseAmount, setNoiseAmount] = useState(0.12)
  const [toolKey, setToolKey] = useState(tools[0].key)
  const [toolScale, setToolScale] = useState(1)
  const [gifFrames, setGifFrames] = useState(90)
  const [gifStepSize, setGifStepSize] = useState(1)
  const [gifFps, setGifFps] = useState(16)
  const [gifScale, setGifScale] = useState(2)
  const [gifFilename, setGifFilename] = useState("life-export.gif")
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [overlayColorMode, setOverlayColorMode] = useState<"seed" | "custom">("seed")
  const [overlayColor, setOverlayColor] = useState("#ffffff")
  const [previewFrames, setPreviewFrames] = useState<Snapshot[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewDirection, setPreviewDirection] = useState<-1 | 0 | 1>(0)
  const [stageMode, setStageMode] = useState<"live" | "preview">("live")
  const [, setStatusMessage] = useState("Compose a scene, capture a preview, then export the run you like.")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [transitionProgress, setTransitionProgress] = useState(1)
  const [livePlaying, setLivePlaying] = useState(false)

  const [grid, setGrid] = useState<number[][]>(() => initialGrid)
  const [previousGrid, setPreviousGrid] = useState<number[][]>(() => createEmptyGrid(defaultRows, defaultCols))
  const [generation, setGeneration] = useState(0)
  const [liveCells, setLiveCells] = useState(() => countLive(initialGrid))
  const [dragMode, setDragMode] = useState<0 | 1 | null>(null)
  const [startingSnapshot, setStartingSnapshot] = useState<Snapshot>(() =>
    makeSnapshot(initialGrid, createEmptyGrid(defaultRows, defaultCols), 0),
  )

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageViewportRef = useRef<HTMLDivElement | null>(null)
  const panOriginRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const transitionFrameRef = useRef<number | null>(null)
  const liveFrameRef = useRef<number | null>(null)
  const liveAccumulatorRef = useRef(0)
  const liveLastTimeRef = useRef<number | null>(null)
  const gridRef = useRef(grid)
  const previousGridRef = useRef(previousGrid)
  const generationRef = useRef(generation)
  const liveCellsRef = useRef(liveCells)
  const hudSyncTimeRef = useRef(0)

  const activePalette = useMemo(
    () => ({ key: paletteKey, label: "", background: backgroundColor, cell: cellColor, grid: gridColor, trail: trailColor }),
    [backgroundColor, cellColor, gridColor, paletteKey, trailColor],
  )
  const birth = useMemo(() => [...new Set([...birthText].filter((character) => /\d/.test(character)).map(Number))], [birthText])
  const survive = useMemo(() => [...new Set([...surviveText].filter((character) => /\d/.test(character)).map(Number))], [surviveText])
  const overlayPattern = useMemo(() => buildTextPattern(textSeed, textScale), [textScale, textSeed])
  const selectedTool = useMemo(() => tools.find((tool) => tool.key === toolKey) ?? tools[0], [toolKey])
  const previewVisible = stageMode === "preview" && previewFrames.length > 0
  const previewSnapshot = previewVisible ? previewFrames[previewIndex] : null
  const displayedSnapshot = useMemo(() => {
    if (previewSnapshot) {
      return previewSnapshot
    }
    return makeSnapshot(grid, previousGrid, generation)
  }, [generation, grid, previousGrid, previewSnapshot])
  const effectiveTransitionProgress = livePlaying ? 1 : transitionProgress
  const naturalCanvasWidth = cols * cellSize
  const naturalCanvasHeight = rows * cellSize
  const liveStepDelay = Math.max(30, Math.round(1000 / Math.max(1, speed * 1.75)))
  const displayRenderScale = useMemo(() => {
    if (typeof window === "undefined") return 2
    const dpr = window.devicePixelRatio || 1
    return Math.min(5, Math.max(2, dpr * Math.max(1, zoom)))
  }, [zoom])
  const exportOverlay = useMemo(
    () =>
      overlayEnabled && overlayPattern.length > 0
        ? {
            enabled: true,
            color: overlayColorMode === "seed" ? cellColor : overlayColor,
            opacity: overlayOpacity,
            pattern: overlayPattern,
            offsetX: textOffsetX,
            offsetY: textOffsetY,
          }
        : undefined,
    [cellColor, overlayColor, overlayColorMode, overlayEnabled, overlayOpacity, overlayPattern, textOffsetX, textOffsetY],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || livePlaying) return
    renderStageWebGL(
      canvas,
      displayedSnapshot,
      activePalette,
      cellSize,
      showGrid,
      gridContrast,
      trailStrength,
      bloomAmount,
      bloomRadius,
      effectiveTransitionProgress,
      displayRenderScale,
      undefined,
    )
  }, [
    activePalette,
    bloomAmount,
    bloomRadius,
    cellSize,
    displayedSnapshot,
    gridContrast,
    showGrid,
    trailStrength,
    effectiveTransitionProgress,
    displayRenderScale,
    livePlaying,
  ])

  useEffect(() => {
    gridRef.current = grid
  }, [grid])

  useEffect(() => {
    previousGridRef.current = previousGrid
  }, [previousGrid])

  useEffect(() => {
    generationRef.current = generation
  }, [generation])

  useEffect(() => {
    liveCellsRef.current = liveCells
  }, [liveCells])

  useEffect(() => {
    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }

    if (livePlaying) {
      return
    }

    let startTime: number | null = null
    const previewStepDelay = Math.max(40, Math.round(1000 / Math.max(1, gifFps)))
    const duration = previewDirection !== 0
      ? Math.max(28, Math.min(110, Math.round(previewStepDelay * 0.7)))
      : 180

    const tick = (time: number) => {
      if (startTime === null) startTime = time
      const elapsed = time - startTime
      const next = Math.min(1, elapsed / duration)
      const eased = 1 - (1 - next) * (1 - next)
      setTransitionProgress(eased)
      if (next < 1) {
        transitionFrameRef.current = requestAnimationFrame(tick)
      } else {
        transitionFrameRef.current = null
      }
    }

    transitionFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current)
        transitionFrameRef.current = null
      }
    }
  }, [displayedSnapshot, gifFps, livePlaying, previewDirection])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") setIsSpacePressed(true)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setIsSpacePressed(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    if (previewDirection === 0 || previewFrames.length === 0) return
    const timeout = window.setTimeout(() => {
      setPreviewIndex((current) => {
        const next = current + previewDirection
        if (next < 0 || next >= previewFrames.length) {
          setPreviewDirection(0)
          return current
        }
        return next
      })
    }, Math.max(40, Math.round(1000 / gifFps)))
    return () => window.clearTimeout(timeout)
  }, [gifFps, previewDirection, previewFrames.length])

  useEffect(() => {
    if (!livePlaying) {
      if (liveFrameRef.current !== null) {
        cancelAnimationFrame(liveFrameRef.current)
        liveFrameRef.current = null
      }
      liveAccumulatorRef.current = 0
      liveLastTimeRef.current = null
      hudSyncTimeRef.current = 0
      const syncedGrid = cloneGrid(gridRef.current)
      const syncedPrevious = cloneGrid(previousGridRef.current)
      setGrid(syncedGrid)
      setPreviousGrid(syncedPrevious)
      setGeneration(generationRef.current)
      setLiveCells(liveCellsRef.current)
      return
    }

    const tick = (time: number) => {
      if (liveLastTimeRef.current === null) {
        liveLastTimeRef.current = time
      }
      const delta = time - liveLastTimeRef.current
      liveLastTimeRef.current = time
      liveAccumulatorRef.current += Math.min(delta, liveStepDelay * 3)

      let currentGrid = gridRef.current
      let currentPrevious = previousGridRef.current
      let currentGeneration = generationRef.current
      let currentLiveCells = liveCellsRef.current
      let stepped = false
      let steps = 0

      while (liveAccumulatorRef.current >= liveStepDelay && steps < 4) {
        const next = nextGridState(currentGrid, birth, survive, wrapEdges)
        currentPrevious = cloneGrid(currentGrid)
        currentGrid = next
        currentGeneration += 1
        currentLiveCells = countLive(currentGrid)
        liveAccumulatorRef.current -= liveStepDelay
        steps += 1
        stepped = true
      }

      if (stepped) {
        gridRef.current = currentGrid
        previousGridRef.current = currentPrevious
        generationRef.current = currentGeneration
        liveCellsRef.current = currentLiveCells
        const canvas = canvasRef.current
        if (canvas) {
          renderStageWebGL(
            canvas,
            {
              grid: currentGrid,
              previousGrid: currentPrevious,
              generation: currentGeneration,
              liveCells: currentLiveCells,
            },
            activePalette,
            cellSize,
            showGrid,
            gridContrast,
            trailStrength,
            bloomAmount,
            bloomRadius,
            1,
            displayRenderScale,
            undefined,
          )
        }

        if (time - hudSyncTimeRef.current >= 120) {
          hudSyncTimeRef.current = time
          setGeneration(currentGeneration)
          setLiveCells(currentLiveCells)
        }
      }

      liveFrameRef.current = requestAnimationFrame(tick)
    }

    liveFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (liveFrameRef.current !== null) {
        cancelAnimationFrame(liveFrameRef.current)
        liveFrameRef.current = null
      }
      liveAccumulatorRef.current = 0
      liveLastTimeRef.current = null
    }
  }, [
    activePalette,
    birth,
    bloomAmount,
    bloomRadius,
    cellSize,
    displayRenderScale,
    gridContrast,
    livePlaying,
    liveStepDelay,
    showGrid,
    survive,
    trailStrength,
    wrapEdges,
  ])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fitStageToView()
    }, 0)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalCanvasWidth, naturalCanvasHeight])

  function fitStageToView() {
    const viewport = stageViewportRef.current
    if (!viewport || naturalCanvasWidth === 0 || naturalCanvasHeight === 0) return
    const horizontalPadding = 16
    const verticalPadding = 72
    const nextZoom = Math.max(
      0.15,
      Math.min(
        3,
        (viewport.clientWidth - horizontalPadding) / naturalCanvasWidth,
        (viewport.clientHeight - verticalPadding) / naturalCanvasHeight,
      ),
    )
    setZoom(nextZoom)
    setPan({
      x: (viewport.clientWidth - naturalCanvasWidth * nextZoom) / 2,
      y: (viewport.clientHeight - naturalCanvasHeight * nextZoom) / 2,
    })
  }

  function handleViewportWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const viewport = stageViewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    const worldX = (cursorX - pan.x) / zoom
    const worldY = (cursorY - pan.y) / zoom
    const factor = event.deltaY < 0 ? 1.1 : 0.9
    const nextZoom = Math.max(0.15, Math.min(8, zoom * factor))
    setZoom(nextZoom)
    setPan({
      x: cursorX - worldX * nextZoom,
      y: cursorY - worldY * nextZoom,
    })
  }

  function startPanning(event: React.PointerEvent<HTMLElement>) {
    panOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: pan.x,
      startY: pan.y,
    }
    setIsPanning(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function updatePanning(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!panOriginRef.current) return
    const deltaX = event.clientX - panOriginRef.current.x
    const deltaY = event.clientY - panOriginRef.current.y
    setPan({
      x: panOriginRef.current.startX + deltaX,
      y: panOriginRef.current.startY + deltaY,
    })
  }

  function stopPanning() {
    panOriginRef.current = null
    setIsPanning(false)
  }

  function nudgeZoom(direction: 1 | -1) {
    const viewport = stageViewportRef.current
    if (!viewport) return
    const centerX = viewport.clientWidth / 2
    const centerY = viewport.clientHeight / 2
    const worldX = (centerX - pan.x) / zoom
    const worldY = (centerY - pan.y) / zoom
    const factor = direction > 0 ? 1.15 : 0.87
    const nextZoom = Math.max(0.15, Math.min(8, zoom * factor))
    setZoom(nextZoom)
    setPan({
      x: centerX - worldX * nextZoom,
      y: centerY - worldY * nextZoom,
    })
  }

  function invalidatePreview(message = "Scene changed. Capture a new preview to review or export this setup.") {
    setPreviewFrames([])
    setPreviewIndex(0)
    setPreviewDirection(0)
    setStageMode("live")
    setStatusMessage(message)
  }

  function applySnapshotToStage(snapshot: Snapshot) {
    setLivePlaying(false)
    setStageMode("live")
    const nextGrid = cloneGrid(snapshot.grid)
    const nextPrevious = cloneGrid(snapshot.previousGrid)
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    generationRef.current = snapshot.generation
    liveCellsRef.current = snapshot.liveCells
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setGeneration(snapshot.generation)
    setLiveCells(snapshot.liveCells)
  }

  function captureStartingPoint() {
    const snapshot = makeSnapshot(gridRef.current, createEmptyGrid(rows, cols), 0)
    setStartingSnapshot(snapshot)
    invalidatePreview("Starting point captured. Preview and export will use this scene.")
    setStatusMessage("Starting point captured from the current stage.")
  }

  function resetToStartingPoint() {
    applySnapshotToStage(startingSnapshot)
    invalidatePreview("Reset to the captured starting point.")
  }

  function toggleLivePlayback() {
    setPreviewDirection(0)
    setStageMode("live")
    setLivePlaying((current) => {
      const next = !current
      setStatusMessage(next ? "Live playback running from the current stage." : "Live playback paused.")
      return next
    })
  }

  function updateCanvasSize(nextRows: number, nextCols: number) {
    const safeRows = Math.max(1, nextRows)
    const safeCols = Math.max(1, nextCols)
    setLivePlaying(false)
    setRows(safeRows)
    setCols(safeCols)
    const resizedGrid = resizeGrid(gridRef.current, safeRows, safeCols)
    const resizedPrevious = resizeGrid(previousGridRef.current, safeRows, safeCols)
    gridRef.current = resizedGrid
    previousGridRef.current = resizedPrevious
    generationRef.current = 0
    liveCellsRef.current = countLive(resizedGrid)
    setGrid(resizedGrid)
    setPreviousGrid(resizedPrevious)
    setLiveCells(liveCellsRef.current)
    setGeneration(0)
    setStartingSnapshot((current) => makeSnapshot(resizeGrid(current.grid, safeRows, safeCols), createEmptyGrid(safeRows, safeCols), 0))
    invalidatePreview("Canvas dimensions updated. Capture a new preview for the resized stage.")
  }

  function applyScenePreset(sceneKeyValue: string) {
    const preset = scenes.find((scene) => scene.key === sceneKeyValue)
    if (!preset) return
    const palette = palettes.find((item) => item.key === preset.paletteKey) ?? palettes[0]
    const rule = rules.find((item) => item.key === preset.ruleKey) ?? rules[0]
    setSceneKey(preset.key)
    setPaletteKey(palette.key)
    setRuleKey(rule.key)
    setBirthText(rule.birth.join(""))
    setSurviveText(rule.survive.join(""))
    setDensity(preset.density)
    setSpeed(preset.speed)
    setTrailStrength(preset.trail)
    setGridContrast(preset.gridContrast)
    setCellSize(preset.cellSize)
    setShowGrid(preset.showGrid)
    setBackgroundColor(palette.background)
    setCellColor(palette.cell)
    setGridColor(palette.grid)
    setTrailColor(palette.trail)
    if (preset.key === "blank-canvas") {
      setTextSeed(defaultTextSeed)
      setTextScale(defaultTextScale)
      setTextOffsetX(0)
      setTextOffsetY(0)
      const nextGrid = createSeededTextGrid(rows, cols, defaultTextSeed, defaultTextScale)
      const nextPrevious = createEmptyGrid(rows, cols)
      const snapshot = makeSnapshot(nextGrid, nextPrevious, 0)
      gridRef.current = nextGrid
      previousGridRef.current = nextPrevious
      generationRef.current = 0
      liveCellsRef.current = snapshot.liveCells
      setGrid(nextGrid)
      setPreviousGrid(nextPrevious)
      setGeneration(0)
      setLiveCells(snapshot.liveCells)
      setStartingSnapshot(snapshot)
      invalidatePreview("Blank Conway title scene applied.")
      return
    }
    randomizeScene(preset.density, "Scene preset applied.")
  }

  function applyPalettePreset(paletteValue: string) {
    const palette = palettes.find((item) => item.key === paletteValue)
    if (!palette) return
    setPaletteKey(palette.key)
    setBackgroundColor(palette.background)
    setCellColor(palette.cell)
    setGridColor(palette.grid)
    setTrailColor(palette.trail)
    invalidatePreview("Color palette updated. Capture a new preview to see the refreshed look.")
  }

  function applyRulePreset(ruleValue: string) {
    const rule = rules.find((item) => item.key === ruleValue)
    if (!rule) return
    setRuleKey(rule.key)
    setBirthText(rule.birth.join(""))
    setSurviveText(rule.survive.join(""))
    setDensity(rule.density)
    invalidatePreview("Rule updated. Capture a new preview to see the new behavior.")
  }

  function resetScene() {
    setLivePlaying(false)
    const nextGrid = createEmptyGrid(rows, cols)
    const nextPrevious = createEmptyGrid(rows, cols)
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    generationRef.current = 0
    liveCellsRef.current = 0
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setGeneration(0)
    setLiveCells(0)
    invalidatePreview("Scene reset. Add seeds or paint directly on the stage.")
  }

  function randomizeScene(nextDensity = density, message = "Scene randomized with the current density.") {
    setLivePlaying(false)
    const nextGrid = randomizeGrid(rows, cols, nextDensity)
    const nextPrevious = createEmptyGrid(rows, cols)
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    generationRef.current = 0
    liveCellsRef.current = countLive(nextGrid)
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setGeneration(0)
    setLiveCells(liveCellsRef.current)
    invalidatePreview(message)
  }

  function stampText() {
    if (!textSeed.trim()) return
    setLivePlaying(false)
    const pattern = overlayPattern
    if (pattern.length === 0) return
    const nextGrid = cloneGrid(gridRef.current)
    const nextPrevious = cloneGrid(previousGridRef.current)
    const startRow = Math.max(0, Math.floor((rows - pattern.length) / 2 + textOffsetY))
    const startCol = Math.max(0, Math.floor((cols - pattern[0].length) / 2 + textOffsetX))
    applyPattern(nextGrid, pattern, startRow, startCol)
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    liveCellsRef.current = countLive(nextGrid)
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setLiveCells(liveCellsRef.current)
    invalidatePreview("Text stamped into the scene. Capture a new preview when you are ready.")
  }

  function blendNoise() {
    setLivePlaying(false)
    const nextGrid = cloneGrid(gridRef.current)
    const nextPrevious = cloneGrid(previousGridRef.current)
    const noiseDensity = Math.max(0.01, Math.min(0.45, noiseAmount))
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!nextGrid[row][col] && Math.random() < noiseDensity) nextGrid[row][col] = 1
      }
    }
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    liveCellsRef.current = countLive(nextGrid)
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setLiveCells(liveCellsRef.current)
    invalidatePreview("Noise blended into the scene. Capture a new preview to review the added texture.")
  }

  function advanceSimulation(startGrid: number[][], startPreviousGrid: number[][], startGeneration: number, steps: number) {
    let currentGrid = cloneGrid(startGrid)
    let currentPrevious = cloneGrid(startPreviousGrid)
    let currentGeneration = startGeneration

    for (let step = 0; step < steps; step += 1) {
      const next = nextGridState(currentGrid, birth, survive, wrapEdges)
      currentPrevious = currentGrid
      currentGrid = next
      currentGeneration += 1
    }

    return makeSnapshot(currentGrid, currentPrevious, currentGeneration)
  }

  function capturePreview() {
    const snapshots: Snapshot[] = []
    let current = makeSnapshot(startingSnapshot.grid, startingSnapshot.previousGrid, startingSnapshot.generation)
    snapshots.push(current)
    for (let frame = 1; frame < gifFrames; frame += 1) {
      current = advanceSimulation(current.grid, current.previousGrid, current.generation, gifStepSize)
      snapshots.push(current)
    }
    setPreviewFrames(snapshots)
    setPreviewIndex(0)
    setPreviewDirection(0)
    setStageMode("preview")
    setWorkflowTab("review")
    setStatusMessage(`Preview captured with ${snapshots.length} frames.`)
  }

  function handleStagePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button === 1 || isSpacePressed) {
      startPanning(event)
      return
    }
    if (workflowTab !== "scene") return
    handleCanvasPointer(event, false)
  }

  function handleCanvasPointer(event: React.PointerEvent<HTMLCanvasElement>, dragging: boolean) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * cols)
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * rows)
    if (row < 0 || row >= rows || col < 0 || col >= cols) return

    if (selectedTool.kind === "action") return

    if (selectedTool.key !== "brush" && selectedTool.pattern) {
      const nextGrid = cloneGrid(gridRef.current)
      const pattern = scalePattern(selectedTool.pattern, toolScale)
      const top = row - Math.floor(pattern.length / 2)
      const left = col - Math.floor(pattern[0].length / 2)
      applyPattern(nextGrid, pattern, top, left)
      gridRef.current = nextGrid
      liveCellsRef.current = countLive(nextGrid)
      setGrid(nextGrid)
      setLiveCells(liveCellsRef.current)
      invalidatePreview()
      return
    }

    const nextGrid = cloneGrid(gridRef.current)
    const nextDragMode = dragging && dragMode !== null ? dragMode : gridRef.current[row][col] ? 0 : 1
    const brushRadius = Math.max(0, Math.floor(toolScale / 2))
    for (let y = row - brushRadius; y <= row + brushRadius; y += 1) {
      for (let x = col - brushRadius; x <= col + brushRadius; x += 1) {
        if (y < 0 || y >= rows || x < 0 || x >= cols) continue
        nextGrid[y][x] = nextDragMode
      }
    }
    gridRef.current = nextGrid
    liveCellsRef.current = countLive(nextGrid)
    setDragMode(nextDragMode as 0 | 1)
    setGrid(nextGrid)
    setLiveCells(liveCellsRef.current)
    invalidatePreview()
  }

  async function exportGif() {
    if (previewFrames.length === 0) {
      setStatusMessage("Capture a preview before exporting.")
      setWorkflowTab("review")
      return
    }

    const exportCanvas = exportCanvasRef.current ?? document.createElement("canvas")
    exportCanvasRef.current = exportCanvas
    const gif = GIFEncoder()

    previewFrames.forEach((snapshot, index) => {
      renderSnapshot2D(
        exportCanvas,
        snapshot,
        activePalette,
        cellSize * gifScale,
        showGrid,
        gridContrast,
        trailStrength,
        bloomAmount,
        bloomRadius,
        1,
        Math.max(1, typeof window === "undefined" ? 2 : window.devicePixelRatio || 1),
        exportOverlay,
      )
      const ctx = exportCanvas.getContext("2d")
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height)
      const palette = quantize(imageData.data, 256)
      const indexed = applyPalette(imageData.data, palette)
      gif.writeFrame(indexed, exportCanvas.width, exportCanvas.height, {
        palette,
        delay: Math.round(1000 / gifFps),
        repeat: 0,
        first: index === 0,
      })
    })

    gif.finish()
    const gifBytes = Uint8Array.from(gif.bytes())
    const blob = new Blob([gifBytes], { type: "image/gif" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = gifFilename.endsWith(".gif") ? gifFilename : `${gifFilename}.gif`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatusMessage(`Exported ${previewFrames.length} frames to ${anchor.download}.`)
  }

  function setPreviewFrame(index: number) {
    if (previewFrames.length === 0) return
    setPreviewDirection(0)
    setStageMode("preview")
    setPreviewIndex(Math.max(0, Math.min(previewFrames.length - 1, index)))
  }

  function startPreviewPlayback(direction: -1 | 1) {
    if (previewFrames.length === 0) return
    setLivePlaying(false)
    setStageMode("preview")
    setPreviewDirection(direction)
  }

  const stageCursor = isPanning
    ? "grabbing"
    : isSpacePressed
      ? "grab"
      : workflowTab === "scene"
        ? selectedTool.kind === "action"
          ? "default"
          : selectedTool.key === "brush"
            ? "crosshair"
            : "copy"
        : "default"

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.14),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.1),_transparent_22%),linear-gradient(180deg,_#05070b,_#0a0f17_48%,_#05070b)] text-foreground">
        <Tabs value={workflowTab} onValueChange={(value) => setWorkflowTab(value as "scene" | "review")}>
          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute left-4 top-4 z-20 flex max-w-[calc(100vw-2rem)] flex-col md:left-6 md:top-6">
              <div className="rounded-2xl border border-border/70 bg-card/78 px-4 py-3 shadow-2xl backdrop-blur-2xl">
                <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Game of Life Studio</h1>
              </div>
            </div>

            <div className="pointer-events-auto absolute right-4 top-4 z-20 md:right-6 md:top-6">
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-2 shadow-2xl backdrop-blur-xl">
                <Button variant="secondary" size="icon" onClick={() => nudgeZoom(-1)}><Minus className="size-4" /></Button>
                <Button variant="secondary" size="icon" onClick={() => nudgeZoom(1)}><Plus className="size-4" /></Button>
                <Button variant="outline" size="sm" className="min-w-32" onClick={fitStageToView}><Move className="size-4" />Fit Stage</Button>
              </div>
            </div>

            <div className="pointer-events-auto absolute left-[calc(25rem+((100vw-25rem)/2))] top-4 z-20 w-fit max-w-[calc(100vw-27rem)] -translate-x-1/2 md:top-6">
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-card/70 px-2.5 py-2 shadow-2xl backdrop-blur-2xl">
                <Button size="sm" onClick={toggleLivePlayback}>
                  {livePlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {livePlaying ? "Pause" : "Play"}
                </Button>
                <Button size="sm" variant="secondary" onClick={resetToStartingPoint}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                <Button size="sm" variant="outline" onClick={captureStartingPoint}>
                  <Sparkles className="size-4" />
                  Set Starting Point
                </Button>
              </div>
            </div>

            <Card className="pointer-events-auto absolute bottom-6 left-4 top-28 z-10 hidden w-[22.5rem] max-w-[calc(100vw-2rem)] flex-col border-border/70 bg-card/78 shadow-2xl backdrop-blur-2xl lg:flex lg:left-6">
              <CardContent className="flex h-full flex-col overflow-y-auto p-4">
                <div className="sticky top-0 z-20 mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-xl">
                  <TabsList className="grid h-auto w-full shrink-0 grid-cols-2 rounded-none border-0 bg-transparent p-1.5">
                    <TabsTrigger value="scene" className="gap-2"><Grid3X3 className="size-4" />Scene Setup</TabsTrigger>
                    <TabsTrigger value="review" className="gap-2"><Play className="size-4" />Preview / Export</TabsTrigger>
                  </TabsList>
                  {workflowTab === "scene" ? (
                    <Tabs value={sceneTab} onValueChange={setSceneTab}>
                      <TabsList className="grid w-full shrink-0 grid-cols-2 rounded-none border-0 border-t border-border/70 bg-transparent p-1.5 pt-0">
                        <TabsTrigger value="scene" className="gap-2"><Circle className="size-4" />Scene</TabsTrigger>
                        <TabsTrigger value="colors" className="gap-2"><Sparkles className="size-4" />Colors</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : null}
                </div>
                {workflowTab === "scene" ? (
                  <Tabs value={sceneTab} onValueChange={setSceneTab}>
                    <TabsContent value="scene" className="space-y-4">
                      <div className="space-y-3 rounded-[24px] border border-border/70 bg-panel/85 p-3.5">
                        <Field label="Base scene">
                          <Select value={sceneKey} onValueChange={applyScenePreset}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {scenes.map((scene) => <SelectItem key={scene.key} value={scene.key}>{scene.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Automaton">
                          <Select value={ruleKey} onValueChange={applyRulePreset}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {rules.map((rule) => <SelectItem key={rule.key} value={rule.key}>{rule.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Birth"><Input value={birthText} onChange={(event) => { setBirthText(event.target.value); invalidatePreview() }} /></Field>
                          <Field label="Survive"><Input value={surviveText} onChange={(event) => { setSurviveText(event.target.value); invalidatePreview() }} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="secondary" onClick={() => randomizeScene(density)}><Sparkles className="size-4" />Randomize</Button>
                          <Button variant="outline" onClick={resetScene}><RotateCcw className="size-4" />Reset</Button>
                        </div>
                      </div>

                      <PanelBlock title="Canvas">
                        <div className="grid grid-cols-3 gap-3">
                          <Field label="Rows"><Input type="number" value={rows} onChange={(event) => updateCanvasSize(Number(event.target.value) || 1, cols)} /></Field>
                          <Field label="Cols"><Input type="number" value={cols} onChange={(event) => updateCanvasSize(rows, Number(event.target.value) || 1)} /></Field>
                          <Field label="Cell"><Input type="number" value={cellSize} onChange={(event) => setCellSize(Number(event.target.value) || 1)} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <CompactToggle label="Wrap edges" checked={wrapEdges} onCheckedChange={(checked) => { setWrapEdges(checked); invalidatePreview() }} />
                          <CompactToggle label="Show grid" checked={showGrid} onCheckedChange={(checked) => { setShowGrid(checked); invalidatePreview() }} />
                        </div>
                        <SliderField label="Density" value={density} min={0.02} max={0.6} step={0.01} onChange={(value) => { setDensity(value); invalidatePreview() }} format={(value) => value.toFixed(2)} />
                        <SliderField label="Speed" value={speed} min={2} max={20} step={1} onChange={(value) => { setSpeed(value); invalidatePreview() }} format={(value) => `${value.toFixed(0)}x`} />
                        <SliderField label="Grid contrast" value={gridContrast} min={0} max={1} step={0.01} onChange={(value) => { setGridContrast(value); invalidatePreview() }} format={(value) => value.toFixed(2)} />
                      </PanelBlock>
                    </TabsContent>

                    <TabsContent value="colors" className="space-y-4">
                      <PanelBlock title="Palette preset">
                        <Field label="Preset">
                          <Select value={paletteKey} onValueChange={applyPalettePreset}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {palettes.map((palette) => <SelectItem key={palette.key} value={palette.key}>{palette.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <div className="grid grid-cols-4 gap-2">
                          {[backgroundColor, cellColor, gridColor, trailColor].map((color) => (
                            <div key={color} className="h-11 rounded-2xl border border-border/70" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      </PanelBlock>

                      <PanelBlock title="Effects" description="Tune glow and fade styling for the stage.">
                        <SliderField label="Trail fade" value={trailStrength} min={0} max={1} step={0.01} onChange={(value) => { setTrailStrength(value); invalidatePreview() }} format={(value) => value.toFixed(2)} />
                        <SliderField label="Bloom intensity" value={bloomAmount} min={0} max={2} step={0.01} onChange={(value) => { setBloomAmount(value); invalidatePreview() }} format={(value) => value.toFixed(2)} />
                        <SliderField label="Bloom radius" value={bloomRadius} min={0.35} max={3} step={0.01} onChange={(value) => { setBloomRadius(value); invalidatePreview() }} format={(value) => value.toFixed(2)} />
                      </PanelBlock>

                      <PanelBlock title="Manual colors">
                        <div className="space-y-1">
                          <CompactColorField label="Background" value={backgroundColor} onChange={(value) => { setBackgroundColor(value); invalidatePreview() }} />
                          <CompactColorField label="Cell" value={cellColor} onChange={(value) => { setCellColor(value); invalidatePreview() }} />
                          <CompactColorField label="Grid" value={gridColor} onChange={(value) => { setGridColor(value); invalidatePreview() }} />
                          <CompactColorField label="Trail" value={trailColor} onChange={(value) => { setTrailColor(value); invalidatePreview() }} />
                        </div>
                      </PanelBlock>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="space-y-4">
                    <PanelBlock title="Capture settings" description="Build the preview timeline from the current scene.">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Frames"><Input type="number" value={gifFrames} onChange={(event) => setGifFrames(Number(event.target.value) || 1)} /></Field>
                        <Field label="Step size"><Input type="number" value={gifStepSize} onChange={(event) => setGifStepSize(Number(event.target.value) || 1)} /></Field>
                        <Field label="Preview FPS"><Input type="number" value={gifFps} onChange={(event) => setGifFps(Number(event.target.value) || 1)} /></Field>
                        <Field label="Export scale"><Input type="number" value={gifScale} onChange={(event) => setGifScale(Number(event.target.value) || 1)} /></Field>
                      </div>
                      <Button size="sm" className="w-full" onClick={capturePreview}><Play className="size-4" />Capture Preview</Button>
                    </PanelBlock>

                    <PanelBlock title="Timeline" description="Scrub or step through captured frames.">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Frame</span>
                        <span>{previewFrames.length ? `${previewIndex + 1} / ${previewFrames.length}` : "No preview yet"}</span>
                      </div>
                      <Slider value={[previewIndex]} min={0} max={Math.max(0, previewFrames.length - 1)} step={1} onValueChange={(value) => setPreviewFrame(value[0] ?? 0)} disabled={!previewFrames.length} />
                      <div className="grid grid-cols-5 gap-2">
                        <Button variant="secondary" onClick={() => setPreviewFrame(0)} disabled={!previewFrames.length}><StepBack className="size-4" /></Button>
                        <Button variant="secondary" onClick={() => setPreviewFrame(previewIndex - 1)} disabled={!previewFrames.length}><ChevronLeft className="size-4" /></Button>
                        <Button variant="secondary" onClick={() => startPreviewPlayback(1)} disabled={!previewFrames.length}><Play className="size-4" /></Button>
                        <Button variant="secondary" onClick={() => setPreviewFrame(previewIndex + 1)} disabled={!previewFrames.length}><ChevronRight className="size-4" /></Button>
                        <Button variant="secondary" onClick={() => setPreviewFrame(previewFrames.length - 1)} disabled={!previewFrames.length}><StepForward className="size-4" /></Button>
                      </div>
                    </PanelBlock>

                    <PanelBlock title="Export settings" description="Write the current approved preview directly to GIF.">
                      <Field label="GIF filename"><Input value={gifFilename} onChange={(event) => setGifFilename(event.target.value)} /></Field>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-input/35 px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">Seed text overlay</p>
                            <p className="text-xs text-muted-foreground">Only applies when seed text exists.</p>
                          </div>
                          <Switch checked={overlayEnabled} onCheckedChange={setOverlayEnabled} />
                        </div>
                        <Field label="Color mode">
                          <Select value={overlayColorMode} onValueChange={(value) => setOverlayColorMode(value as "seed" | "custom")}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="seed">Same as seed</SelectItem>
                              <SelectItem value="custom">Custom tint</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        {overlayColorMode === "custom" ? <CompactColorField label="Overlay color" value={overlayColor} onChange={setOverlayColor} /> : null}
                      </div>
                      <SliderField label="Overlay opacity" value={overlayOpacity} min={0} max={1} step={0.01} onChange={setOverlayOpacity} format={(value) => `${Math.round(value * 100)}%`} />
                    </PanelBlock>

                    <PanelBlock title="Export readiness" description="Quick checks before the final render.">
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Frames" value={previewFrames.length || "None"} />
                        <InfoRow label="Scale" value={`${gifScale}x`} />
                        <InfoRow label="FPS" value={gifFps} />
                        <InfoRow label="Overlay" value={overlayEnabled ? "On" : "Off"} />
                      </div>
                      <Button className="w-full" onClick={exportGif}>
                        <Download className="size-4" />
                        Export GIF
                      </Button>
                    </PanelBlock>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="pointer-events-auto absolute bottom-3 left-[calc(25rem+((100vw-25rem)/2))] z-20 w-[min(44rem,calc(100vw-27rem))] -translate-x-1/2 md:bottom-4">
              <div className="rounded-[22px] border border-border/70 bg-card/78 p-2 shadow-2xl backdrop-blur-2xl">
                {workflowTab === "scene" ? (
                  <div className="space-y-1.5">
                    <div className="rounded-xl border border-border/70 bg-input/35 px-2.5 py-2">
                      {selectedTool.key === "text" ? (
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_48px_44px_44px_auto]">
                          <Field label="Seed text"><Input value={textSeed} onChange={(event) => setTextSeed(event.target.value)} /></Field>
                          <Field label="Size"><Input type="number" value={textScale} onChange={(event) => setTextScale(Number(event.target.value) || 1)} /></Field>
                          <Field label="X"><Input type="number" value={textOffsetX} onChange={(event) => setTextOffsetX(Number(event.target.value) || 0)} /></Field>
                          <Field label="Y"><Input type="number" value={textOffsetY} onChange={(event) => setTextOffsetY(Number(event.target.value) || 0)} /></Field>
                          <div className="flex items-end">
                            <Button size="sm" variant="secondary" className="w-full" onClick={stampText}><Captions className="size-4" />Stamp Text</Button>
                          </div>
                        </div>
                      ) : selectedTool.key === "noise" ? (
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <SliderField label="Noise mix" value={noiseAmount} min={0.01} max={0.4} step={0.01} onChange={setNoiseAmount} format={(value) => value.toFixed(2)} />
                          <div className="flex items-end">
                            <Button size="sm" variant="secondary" className="w-full min-w-32" onClick={blendNoise}><Sparkles className="size-4" />Add Noise</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,150px)_minmax(0,1fr)] lg:items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{selectedTool.label}</p>
                            <p className="text-[11px] leading-5 text-muted-foreground">
                              {selectedTool.kind === "paint" ? "Click and drag on the stage to paint or erase cells." : "Click on the stage to stamp this pattern into the scene."}
                            </p>
                          </div>
                          <div>
                            <SliderField
                              label={selectedTool.kind === "paint" ? "Brush size" : "Stamp size"}
                              value={toolScale}
                              min={1}
                              max={selectedTool.kind === "paint" ? 9 : 6}
                              step={1}
                              onChange={setToolScale}
                              format={(value) => `${Math.round(value)}x`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {tools.map((tool) => {
                        const Icon = tool.icon
                        return (
                          <Tooltip key={tool.key}>
                            <TooltipTrigger asChild>
                              <button type="button" className={toolButtonClass(toolKey === tool.key)} onClick={() => setToolKey(tool.key)}>
                                <Icon className="size-5" />
                                <span>{tool.label}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tool.kind === "paint"
                                ? "Paint or erase one cell at a time."
                                : tool.kind === "action"
                                  ? "Show settings for this scene action."
                                  : "Stamp an additive pattern into the current scene."}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                      <button type="button" className={cn(toolButtonClass(false), "ml-1")} onClick={resetScene}>
                        <BrushCleaning className="size-4" />
                        Clear Canvas
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={capturePreview}><Play className="size-4" />Capture</Button>
                    <Button variant="secondary" onClick={() => setPreviewFrame(0)} disabled={!previewFrames.length}><StepBack className="size-4" />First</Button>
                    <Button variant="secondary" onClick={() => setPreviewFrame(previewIndex - 1)} disabled={!previewFrames.length}><ChevronLeft className="size-4" />Prev</Button>
                    <Button variant="secondary" onClick={() => startPreviewPlayback(1)} disabled={!previewFrames.length}><Play className="size-4" />Play</Button>
                    <Button variant="secondary" onClick={() => startPreviewPlayback(-1)} disabled={!previewFrames.length}><RotateCcw className="size-4" />Reverse</Button>
                    <Button variant="secondary" onClick={() => { setStageMode("preview"); setPreviewDirection(0) }} disabled={!previewFrames.length}><Pause className="size-4" />Stop</Button>
                    <Button variant="secondary" onClick={() => setPreviewFrame(previewIndex + 1)} disabled={!previewFrames.length}><ChevronRight className="size-4" />Next</Button>
                    <Button variant="secondary" onClick={() => setPreviewFrame(previewFrames.length - 1)} disabled={!previewFrames.length}><StepForward className="size-4" />Last</Button>
                    <div className="min-w-[220px] flex-1 px-2">
                      <Slider value={[previewIndex]} min={0} max={Math.max(0, previewFrames.length - 1)} step={1} onValueChange={(value) => setPreviewFrame(value[0] ?? 0)} disabled={!previewFrames.length} />
                    </div>
                    <div className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                      {previewFrames.length ? `${previewFrames.length} approved frames ready` : "Capture a preview first"}
                    </div>
                    <Button size="lg" onClick={exportGif} disabled={!previewFrames.length}>
                      <Download className="size-4" />
                      Export approved preview
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-[25rem] right-0 top-0">
            <div ref={stageViewportRef} className="absolute inset-0 overflow-hidden" onWheel={handleViewportWheel}>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:120px_120px] opacity-40" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(3,6,12,0.16)_52%,_rgba(3,6,12,0.82)_100%)]" />
              <canvas
                ref={canvasRef}
                className="absolute left-0 top-0 border border-white/8 shadow-[0_32px_80px_rgba(0,0,0,0.45)]"
                style={{
                  width: naturalCanvasWidth,
                  height: naturalCanvasHeight,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "top left",
                  cursor: stageCursor,
                }}
                onPointerDown={handleStagePointerDown}
                onPointerMove={(event) => {
                  if (isPanning) {
                    updatePanning(event)
                    return
                  }
                  if (event.buttons === 1 && workflowTab === "scene") handleCanvasPointer(event, true)
                }}
                onPointerUp={() => {
                  stopPanning()
                  setDragMode(null)
                }}
                onPointerLeave={() => {
                  stopPanning()
                  setDragMode(null)
                }}
                onContextMenu={(event) => event.preventDefault()}
              />
            </div>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format: (value: number) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-foreground">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? value)} />
    </div>
  )
}

function CompactColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)_34px] items-center gap-2 border-b border-border/50 py-1.5 last:border-b-0 last:pb-0 first:pt-0">
      <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg px-2.5 text-sm" />
      <div className="shrink-0">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
      </div>
    </div>
  )
}

function PanelBlock({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-[24px] border border-border/70 bg-panel/85 p-3.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

function CompactToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-input/45 px-2.5 py-2">
      <p className="text-[13px] font-medium text-foreground whitespace-nowrap">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export default App
