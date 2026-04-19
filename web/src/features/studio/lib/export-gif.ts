import { GIFEncoder, applyPalette, quantize } from "gifenc"

import type { OverlayRenderConfig, Palette, Snapshot } from "../types"
import { renderSnapshot2D } from "./render-stage"

type GifExportOptions = {
  snapshots: Snapshot[]
  palette: Palette
  cellSize: number
  gifScale: number
  showGrid: boolean
  gridContrast: number
  trailStrength: number
  bloomAmount: number
  bloomRadius: number
  fps: number
  overlay?: OverlayRenderConfig
}

export function buildGifBlob({
  snapshots,
  palette,
  cellSize,
  gifScale,
  showGrid,
  gridContrast,
  trailStrength,
  bloomAmount,
  bloomRadius,
  fps,
  overlay,
}: GifExportOptions) {
  const exportCanvas = document.createElement("canvas")
  const gif = GIFEncoder()

  snapshots.forEach((snapshot, index) => {
    renderSnapshot2D(
      exportCanvas,
      snapshot,
      palette,
      cellSize * gifScale,
      showGrid,
      gridContrast,
      trailStrength,
      bloomAmount,
      bloomRadius,
      1,
      Math.max(1, typeof window === "undefined" ? 2 : window.devicePixelRatio || 1),
      overlay,
    )
    const ctx = exportCanvas.getContext("2d")
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height)
    const paletteDefinition = quantize(imageData.data, 256)
    const indexed = applyPalette(imageData.data, paletteDefinition)
    gif.writeFrame(indexed, exportCanvas.width, exportCanvas.height, {
      palette: paletteDefinition,
      delay: Math.round(1000 / fps),
      repeat: 0,
      first: index === 0,
    })
  })

  gif.finish()
  const gifBytes = Uint8Array.from(gif.bytes())
  return new Blob([gifBytes], { type: "image/gif" })
}
