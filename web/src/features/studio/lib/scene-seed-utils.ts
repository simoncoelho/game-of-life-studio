import type { SceneSeedMode } from "../types"

import { createEmptyGrid, randomizeGrid } from "./grid-utils"

const TAU = Math.PI * 2

export function createSceneSeedGrid(rows: number, cols: number, seedMode: SceneSeedMode, density: number) {
  switch (seedMode) {
    case "petri-colonies":
      return createPetriColoniesGrid(rows, cols, density)
    case "root-network":
      return createRootNetworkGrid(rows, cols, density)
    case "coral-clusters":
      return createCoralClustersGrid(rows, cols, density)
    case "smiley-burst":
      return createSmileyBurstGrid(rows, cols, density)
    default:
      return randomizeGrid(rows, cols, density)
  }
}

function createPetriColoniesGrid(rows: number, cols: number, density: number) {
  const grid = createEmptyGrid(rows, cols)
  const minSize = Math.min(rows, cols)
  const colonyCount = 4 + Math.round(density * 8)
  const colonyCenters: Array<{ row: number; col: number; radius: number }> = []

  for (let index = 0; index < colonyCount; index += 1) {
    const centerRow = randomBetween(rows * 0.18, rows * 0.82)
    const centerCol = randomBetween(cols * 0.16, cols * 0.84)
    const radius = randomBetween(minSize * 0.045, minSize * 0.095)
    const blobCount = randomInt(4, 7)

    colonyCenters.push({ row: centerRow, col: centerCol, radius })

    for (let blob = 0; blob < blobCount; blob += 1) {
      const angle = randomBetween(0, TAU)
      const distance = randomBetween(0, radius * 0.72)
      const blobRow = centerRow + Math.sin(angle) * distance * 0.9
      const blobCol = centerCol + Math.cos(angle) * distance
      paintDisc(grid, blobRow, blobCol, randomBetween(radius * 0.32, radius * 0.68), 0.86)
    }

    paintAnnulus(grid, centerRow, centerCol, radius * 0.58, radius * 1.06, 0.42)
    paintDisc(grid, centerRow, centerCol, radius * 0.22, 0.96)
    sprinkleRect(
      grid,
      centerRow - radius * 1.3,
      centerCol - radius * 1.3,
      centerRow + radius * 1.3,
      centerCol + radius * 1.3,
      0.012 + density * 0.045,
    )
  }

  for (let index = 1; index < colonyCenters.length; index += 1) {
    const current = colonyCenters[index]
    const previous = colonyCenters[index - 1]
    const distance = Math.hypot(current.row - previous.row, current.col - previous.col)
    if (distance > minSize * 0.34 || Math.random() < 0.35) continue
    paintLine(grid, previous.row, previous.col, current.row, current.col, randomBetween(0.8, 1.6), 0.18)
  }

  sprinkleRect(grid, 0, 0, rows - 1, cols - 1, density * 0.01)
  return grid
}

function createRootNetworkGrid(rows: number, cols: number, density: number) {
  const grid = createEmptyGrid(rows, cols)
  const trunkCount = 3 + Math.round(density * 10)

  for (let trunk = 0; trunk < trunkCount; trunk += 1) {
    const startRow = rows - randomBetween(6, 16)
    const startCol = cols * 0.5 + randomBetween(-cols * 0.16, cols * 0.16)
    growBranch(
      grid,
      startRow,
      startCol,
      -Math.PI / 2 + randomBetween(-0.6, 0.6),
      rows * randomBetween(0.2, 0.34),
      randomBetween(1.4, 2.4),
      0,
      3,
    )
  }

  for (let patch = 0; patch < 6; patch += 1) {
    const patchRow = randomBetween(rows * 0.18, rows * 0.82)
    const patchCol = randomBetween(cols * 0.18, cols * 0.82)
    paintDisc(grid, patchRow, patchCol, randomBetween(1.2, 2.8), 0.65)
  }

  return grid
}

function createCoralClustersGrid(rows: number, cols: number, density: number) {
  const grid = createEmptyGrid(rows, cols)
  const minSize = Math.min(rows, cols)
  const clusterCount = 5 + Math.round(density * 9)

  for (let cluster = 0; cluster < clusterCount; cluster += 1) {
    const centerRow = randomBetween(rows * 0.18, rows * 0.82)
    const centerCol = randomBetween(cols * 0.14, cols * 0.86)
    const radius = randomBetween(minSize * 0.04, minSize * 0.085)
    const nuggetCount = randomInt(6, 10)

    for (let nugget = 0; nugget < nuggetCount; nugget += 1) {
      const angle = randomBetween(0, TAU)
      const distance = randomBetween(0, radius * 1.1)
      const nuggetRow = centerRow + Math.sin(angle) * distance * 0.86
      const nuggetCol = centerCol + Math.cos(angle) * distance * 1.12
      paintDisc(grid, nuggetRow, nuggetCol, randomBetween(radius * 0.22, radius * 0.58), 0.9)
    }

    for (let hole = 0; hole < randomInt(2, 4); hole += 1) {
      const angle = randomBetween(0, TAU)
      const distance = randomBetween(0, radius * 0.7)
      paintDisc(
        grid,
        centerRow + Math.sin(angle) * distance,
        centerCol + Math.cos(angle) * distance,
        randomBetween(radius * 0.12, radius * 0.24),
        1,
        0,
      )
    }

    if (Math.random() < 0.72) {
      paintLine(
        grid,
        centerRow,
        centerCol,
        centerRow + randomBetween(-radius * 1.1, radius * 1.1),
        centerCol + randomBetween(-radius * 1.5, radius * 1.5),
        randomBetween(0.8, 1.8),
        0.12,
      )
    }
  }

  sprinkleRect(grid, 0, 0, rows - 1, cols - 1, density * 0.008)
  return grid
}

function createSmileyBurstGrid(rows: number, cols: number, density: number) {
  const grid = createEmptyGrid(rows, cols)
  const centerRow = rows * 0.48
  const centerCol = cols * 0.5
  const radiusY = Math.min(rows * 0.2, cols * 0.12)
  const radiusX = radiusY * 1.16

  paintEllipseRing(grid, centerRow, centerCol, radiusY, radiusX, Math.max(2, radiusY * 0.18), 0.96)
  fillEllipse(grid, centerRow, centerCol, radiusY * 0.78, radiusX * 0.78, density * 0.18)

  paintDisc(grid, centerRow - radiusY * 0.26, centerCol - radiusX * 0.33, radiusY * 0.11, 1)
  paintDisc(grid, centerRow - radiusY * 0.26, centerCol + radiusX * 0.33, radiusY * 0.11, 1)

  for (let step = 0; step <= 18; step += 1) {
    const angle = Math.PI * (0.08 + (0.84 * step) / 18)
    const row = centerRow + radiusY * 0.14 + Math.sin(angle) * radiusY * 0.28
    const col = centerCol + Math.cos(angle) * radiusX * 0.46
    paintDisc(grid, row, col, Math.max(1.1, radiusY * 0.05), 0.96)
  }

  const sparkleCount = 6 + Math.round(density * 14)
  for (let sparkle = 0; sparkle < sparkleCount; sparkle += 1) {
    const angle = randomBetween(0, TAU)
    const distance = randomBetween(radiusX * 1.15, radiusX * 1.85)
    paintSparkle(
      grid,
      centerRow + Math.sin(angle) * distance * 0.72,
      centerCol + Math.cos(angle) * distance,
      randomInt(2, 4),
    )
  }

  return grid
}

function growBranch(
  grid: number[][],
  startRow: number,
  startCol: number,
  startAngle: number,
  length: number,
  thickness: number,
  depth: number,
  maxDepth: number,
) {
  let row = startRow
  let col = startCol
  let angle = startAngle

  for (let step = 0; step < length; step += 1) {
    row += Math.sin(angle)
    col += Math.cos(angle)
    angle += randomBetween(-0.18, 0.18)
    paintDisc(grid, row, col, Math.max(0.8, thickness - step / Math.max(8, length * 1.9)), 0.94)

    if (depth < maxDepth && step > length * 0.22 && Math.random() < 0.085) {
      growBranch(
        grid,
        row,
        col,
        angle + randomBetween(-1.05, 1.05),
        length * randomBetween(0.34, 0.58),
        Math.max(0.8, thickness * 0.72),
        depth + 1,
        maxDepth,
      )
    }
  }

  paintDisc(grid, row, col, Math.max(1, thickness * 0.9), 0.82)
}

function paintDisc(
  grid: number[][],
  centerRow: number,
  centerCol: number,
  radius: number,
  probability = 1,
  value = 1,
) {
  const minRow = Math.max(0, Math.floor(centerRow - radius - 1))
  const maxRow = Math.min(grid.length - 1, Math.ceil(centerRow + radius + 1))
  const minCol = Math.max(0, Math.floor(centerCol - radius - 1))
  const maxCol = Math.min(grid[0].length - 1, Math.ceil(centerCol + radius + 1))
  const radiusSquared = radius * radius

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const distanceSquared = (row - centerRow) ** 2 + (col - centerCol) ** 2
      if (distanceSquared > radiusSquared || Math.random() > probability) continue
      grid[row][col] = value
    }
  }
}

function paintAnnulus(
  grid: number[][],
  centerRow: number,
  centerCol: number,
  innerRadius: number,
  outerRadius: number,
  probability: number,
) {
  const minRow = Math.max(0, Math.floor(centerRow - outerRadius - 1))
  const maxRow = Math.min(grid.length - 1, Math.ceil(centerRow + outerRadius + 1))
  const minCol = Math.max(0, Math.floor(centerCol - outerRadius - 1))
  const maxCol = Math.min(grid[0].length - 1, Math.ceil(centerCol + outerRadius + 1))
  const innerSquared = innerRadius * innerRadius
  const outerSquared = outerRadius * outerRadius

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const distanceSquared = (row - centerRow) ** 2 + (col - centerCol) ** 2
      if (distanceSquared < innerSquared || distanceSquared > outerSquared || Math.random() > probability) continue
      grid[row][col] = 1
    }
  }
}

function fillEllipse(
  grid: number[][],
  centerRow: number,
  centerCol: number,
  radiusY: number,
  radiusX: number,
  probability: number,
) {
  const minRow = Math.max(0, Math.floor(centerRow - radiusY - 1))
  const maxRow = Math.min(grid.length - 1, Math.ceil(centerRow + radiusY + 1))
  const minCol = Math.max(0, Math.floor(centerCol - radiusX - 1))
  const maxCol = Math.min(grid[0].length - 1, Math.ceil(centerCol + radiusX + 1))

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const normalized =
        ((row - centerRow) * (row - centerRow)) / (radiusY * radiusY) +
        ((col - centerCol) * (col - centerCol)) / (radiusX * radiusX)
      if (normalized <= 1 && Math.random() <= probability) {
        grid[row][col] = 1
      }
    }
  }
}

function paintEllipseRing(
  grid: number[][],
  centerRow: number,
  centerCol: number,
  radiusY: number,
  radiusX: number,
  thickness: number,
  probability: number,
) {
  const innerRadiusY = Math.max(1, radiusY - thickness)
  const innerRadiusX = Math.max(1, radiusX - thickness)
  const minRow = Math.max(0, Math.floor(centerRow - radiusY - 1))
  const maxRow = Math.min(grid.length - 1, Math.ceil(centerRow + radiusY + 1))
  const minCol = Math.max(0, Math.floor(centerCol - radiusX - 1))
  const maxCol = Math.min(grid[0].length - 1, Math.ceil(centerCol + radiusX + 1))

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const outer =
        ((row - centerRow) * (row - centerRow)) / (radiusY * radiusY) +
        ((col - centerCol) * (col - centerCol)) / (radiusX * radiusX)
      const inner =
        ((row - centerRow) * (row - centerRow)) / (innerRadiusY * innerRadiusY) +
        ((col - centerCol) * (col - centerCol)) / (innerRadiusX * innerRadiusX)
      if (outer <= 1 && inner >= 1 && Math.random() <= probability) {
        grid[row][col] = 1
      }
    }
  }
}

function paintLine(
  grid: number[][],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  thickness: number,
  jitter: number,
) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(endRow - startRow), Math.abs(endCol - startCol)) * 2))
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps
    const row = startRow + (endRow - startRow) * progress + randomBetween(-jitter, jitter)
    const col = startCol + (endCol - startCol) * progress + randomBetween(-jitter, jitter)
    paintDisc(grid, row, col, thickness, 0.92)
  }
}

function sprinkleRect(
  grid: number[][],
  top: number,
  left: number,
  bottom: number,
  right: number,
  probability: number,
) {
  const minRow = Math.max(0, Math.floor(top))
  const maxRow = Math.min(grid.length - 1, Math.ceil(bottom))
  const minCol = Math.max(0, Math.floor(left))
  const maxCol = Math.min(grid[0].length - 1, Math.ceil(right))

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (Math.random() <= probability) {
        grid[row][col] = 1
      }
    }
  }
}

function paintSparkle(grid: number[][], centerRow: number, centerCol: number, armLength: number) {
  paintDisc(grid, centerRow, centerCol, 1.1, 1)
  for (let arm = 1; arm <= armLength; arm += 1) {
    setCell(grid, centerRow - arm, centerCol)
    setCell(grid, centerRow + arm, centerCol)
    setCell(grid, centerRow, centerCol - arm)
    setCell(grid, centerRow, centerCol + arm)
    if (arm <= Math.max(1, Math.floor(armLength / 2))) {
      setCell(grid, centerRow - arm, centerCol - arm)
      setCell(grid, centerRow - arm, centerCol + arm)
      setCell(grid, centerRow + arm, centerCol - arm)
      setCell(grid, centerRow + arm, centerCol + arm)
    }
  }
}

function setCell(grid: number[][], row: number, col: number, value = 1) {
  const roundedRow = Math.round(row)
  const roundedCol = Math.round(col)
  if (roundedRow < 0 || roundedRow >= grid.length || roundedCol < 0 || roundedCol >= grid[0].length) return
  grid[roundedRow][roundedCol] = value
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1))
}
