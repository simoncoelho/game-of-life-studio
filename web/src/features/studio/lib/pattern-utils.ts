import { FONT_5X7 } from "../constants/font5x7"
import { createEmptyGrid } from "./grid-utils"

export function buildTextPattern(message: string, scale: number) {
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

export function applyPattern(grid: number[][], pattern: number[][], top: number, left: number) {
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

export function scalePattern(pattern: number[][], scale: number) {
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

export function createSeededTextGrid(rows: number, cols: number, text: string, scale: number, offsetX = 0, offsetY = 0) {
  const grid = createEmptyGrid(rows, cols)
  const pattern = buildTextPattern(text, scale)
  if (!pattern.length) return grid
  const startRow = Math.max(0, Math.floor((rows - pattern.length) / 2 + offsetY))
  const startCol = Math.max(0, Math.floor((cols - pattern[0].length) / 2 + offsetX))
  applyPattern(grid, pattern, startRow, startCol)
  return grid
}
