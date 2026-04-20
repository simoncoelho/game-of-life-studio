import type { ComponentType } from "react"

export type Snapshot = {
  grid: number[][]
  previousGrid: number[][]
  generation: number
  liveCells: number
}

export type Palette = {
  key: string
  label: string
  background: string
  cell: string
  grid: string
  trail: string
}

export type SceneSeedMode =
  | "title"
  | "petri-colonies"
  | "root-network"
  | "coral-clusters"
  | "smiley-burst"

export type ScenePreset = {
  key: string
  label: string
  description: string
  seedMode: SceneSeedMode
  ruleKey: string
  paletteKey: string
  density: number
  speed: number
  trail: number
  gridContrast: number
  cellSize: number
  showGrid: boolean
}

export type RulePreset = {
  key: string
  label: string
  description: string
  birth: number[]
  survive: number[]
  density: number
}

export type ToolDefinition = {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  kind: "paint" | "stamp" | "action"
  pattern?: number[][]
}

export type OverlayRenderConfig = {
  enabled: boolean
  color: string
  opacity: number
  pattern: number[][]
  offsetX: number
  offsetY: number
}
