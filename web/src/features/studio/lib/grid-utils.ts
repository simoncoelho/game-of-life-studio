import type { Snapshot } from "../types"

export function createEmptyGrid(rows: number, cols: number) {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(0))
}

export function cloneGrid(grid: number[][]) {
  return grid.map((row) => [...row])
}

export function randomizeGrid(rows: number, cols: number, density: number) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() < density ? 1 : 0)),
  )
}

export function countLive(grid: number[][]) {
  return grid.reduce((sum, row) => sum + row.reduce((inner, cell) => inner + cell, 0), 0)
}

export function resizeGrid(grid: number[][], nextRows: number, nextCols: number) {
  const resized = createEmptyGrid(nextRows, nextCols)
  for (let row = 0; row < Math.min(grid.length, nextRows); row += 1) {
    for (let col = 0; col < Math.min(grid[0]?.length ?? 0, nextCols); col += 1) {
      resized[row][col] = grid[row][col]
    }
  }
  return resized
}

export function makeSnapshot(grid: number[][], previousGrid: number[][], generation: number): Snapshot {
  return {
    grid: cloneGrid(grid),
    previousGrid: cloneGrid(previousGrid),
    generation,
    liveCells: countLive(grid),
  }
}

export function nextGridState(grid: number[][], birth: number[], survive: number[], wrapEdges: boolean) {
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
