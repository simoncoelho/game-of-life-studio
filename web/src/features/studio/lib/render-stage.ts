import { blendColors, boostGlowColor, hexToRgb, hexToRgba } from "./color-utils"
import type { OverlayRenderConfig, Palette, Snapshot } from "../types"

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
  fillColor: string,
  glowColor: string,
  intensity: number,
  cellSize: number,
  glowRadius: number,
) {
  if (intensity <= 0 || size <= 0) return

  const clampedIntensity = Math.max(0, Math.min(1, intensity))
  const radiusScale = Math.max(0.35, glowRadius)
  const centerX = x + size * 0.5
  const centerY = y + size * 0.5
  const outerGlowRadius = Math.max(size * 0.64, size * 0.44 + cellSize * (0.2 + radiusScale * 0.22))
  const innerGlowRadius = Math.max(size * 0.44, size * 0.28 + cellSize * (0.1 + radiusScale * 0.12))
  const innerInset = Math.max(0.35, cellSize * 0.08)
  const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerGlowRadius)
  outerGradient.addColorStop(0, hexToRgba(glowColor, clampedIntensity * 0.48))
  outerGradient.addColorStop(0.18, hexToRgba(glowColor, clampedIntensity * 0.3))
  outerGradient.addColorStop(0.56, hexToRgba(glowColor, clampedIntensity * 0.08))
  outerGradient.addColorStop(1, hexToRgba(glowColor, 0))

  ctx.beginPath()
  ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2)
  ctx.fillStyle = outerGradient
  ctx.fill()

  const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerGlowRadius)
  innerGradient.addColorStop(0, hexToRgba(glowColor, clampedIntensity * 0.66))
  innerGradient.addColorStop(0.34, hexToRgba(glowColor, clampedIntensity * 0.36))
  innerGradient.addColorStop(1, hexToRgba(glowColor, 0))

  ctx.beginPath()
  ctx.arc(centerX, centerY, innerGlowRadius, 0, Math.PI * 2)
  ctx.fillStyle = innerGradient
  ctx.fill()

  fillRoundedCell(
    ctx,
    x,
    y,
    size,
    radius,
    hexToRgba(fillColor, 0.22 + clampedIntensity * 0.64),
  )

  fillRoundedCell(
    ctx,
    x + innerInset,
    y + innerInset,
    Math.max(0.8, size - innerInset * 2),
    Math.max(1, radius - innerInset * 0.65),
    hexToRgba(blendColors(fillColor, "#ffffff", 0.12), clampedIntensity * 0.06),
  )
}

export function renderSnapshot2D(
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
  overlay?: OverlayRenderConfig,
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
  const cellGlowColor = boostGlowColor(palette.cell)
  const trailGlowColor = boostGlowColor(blendColors(palette.cell, palette.trail, 0.82))
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
        drawGlowingCell(ctx, x, y, chipSize, radius, palette.trail, trailGlowColor, Math.min(0.72, trailMix * 1.18) * bloomScale, cellSize, bloomRadius)
      }

      if (liveMix > 0) {
        const scaledSize = chipSize * pulse
        const offset = (chipSize - scaledSize) / 2
        drawGlowingCell(ctx, x + offset, y + offset, scaledSize, radius, palette.cell, cellGlowColor, Math.min(1.08, 0.36 + liveMix * 1.12) * bloomScale, cellSize, bloomRadius)
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

      float squircleMask(vec2 p, float radius, float power) {
        vec2 normalized = abs(p) / vec2(radius);
        float shape = pow(pow(normalized.x, power) + pow(normalized.y, power), 1.0 / power);
        return 1.0 - smoothstep(0.82, 1.0, shape);
      }

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        vec2 coreUv = uv * v_core_scale;
        float core = squircleMask(coreUv, 0.62, 3.6);
        float innerMask = squircleMask(coreUv, 0.46, 3.6);
        float coreHighlight = 1.0 - smoothstep(-0.24, 0.4, length(coreUv + vec2(-0.18, -0.18)));
        float radial = length(uv);
        float halo = exp(-4.9 * radial * radial) * (1.0 - core * 0.8);
        float farHalo = exp(-2.15 * radial * radial) * (1.0 - innerMask * 0.7);
        vec3 color = v_glow.rgb * halo * v_glow.a * 2.28;
        color += v_glow.rgb * farHalo * v_glow.a * 0.42;
        color += v_color.rgb * v_color.a * core;
        color += mix(v_color.rgb, vec3(1.0), 0.1) * 0.05 * coreHighlight * v_color.a * innerMask;
        float alpha = max(core * v_color.a, max(halo * v_glow.a * 1.08, farHalo * v_glow.a * 0.24));
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

export function renderStageWebGL(
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
  overlay?: OverlayRenderConfig,
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
  const cellGlowRgb = hexToRgb(boostGlowColor(palette.cell))
  const trailGlowRgb = hexToRgb(boostGlowColor(blendColors(palette.cell, palette.trail, 0.82)))
  const overlayRgb = overlay ? hexToRgb(blendColors(overlay.color, palette.background, overlay.opacity)) : cellRgb
  const basePointSize = Math.max(1.5, cellSize * renderScale * 1.04)
  const haloPadding = Math.max(0.34, bloomRadius) * Math.max(1.02, cellSize * renderScale * 0.16)
  const pointSize = basePointSize + haloPadding * 2
  const coreScale = pointSize / basePointSize
  const bloomScale = Math.max(0, bloomAmount)
  const liveGlowAlphaBase = (0.66 + 0.24 * Math.min(1, cellSize / 14)) * bloomScale
  const trailGlowAlphaBase = (0.36 + 0.14 * Math.min(1, cellSize / 14)) * bloomScale
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
          Math.min(0.62, trailMix * 0.84),
          trailGlowRgb.r / 255,
          trailGlowRgb.g / 255,
          trailGlowRgb.b / 255,
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
          Math.min(1, 0.24 + liveMix * 0.9),
          cellGlowRgb.r / 255,
          cellGlowRgb.g / 255,
          cellGlowRgb.b / 255,
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
