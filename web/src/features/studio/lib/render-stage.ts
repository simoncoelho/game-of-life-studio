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
  glowIntensity: number,
  coreAlpha: number,
  cellSize: number,
  glowRadius: number,
) {
  if (size <= 0) return

  const clampedGlowIntensity = Math.max(0, Math.min(1, glowIntensity))
  const clampedCoreAlpha = Math.max(0, Math.min(1, coreAlpha))
  if (clampedGlowIntensity <= 0 && clampedCoreAlpha <= 0) return

  const radiusScale = Math.max(0.35, glowRadius)
  const centerX = x + size * 0.5
  const centerY = y + size * 0.5
  const outerGlowRadius = Math.max(size * 0.64, size * 0.44 + cellSize * (0.2 + radiusScale * 0.22))
  const innerGlowRadius = Math.max(size * 0.44, size * 0.28 + cellSize * (0.1 + radiusScale * 0.12))
  const innerInset = Math.max(0.35, cellSize * 0.08)

  if (clampedGlowIntensity > 0) {
    const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerGlowRadius)
    outerGradient.addColorStop(0, hexToRgba(glowColor, clampedGlowIntensity * 0.48))
    outerGradient.addColorStop(0.18, hexToRgba(glowColor, clampedGlowIntensity * 0.3))
    outerGradient.addColorStop(0.56, hexToRgba(glowColor, clampedGlowIntensity * 0.08))
    outerGradient.addColorStop(1, hexToRgba(glowColor, 0))

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2)
    ctx.roundRect(x, y, size, size, radius)
    ctx.clip("evenodd")
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2)
    ctx.fillStyle = outerGradient
    ctx.fill()
    ctx.restore()

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerGlowRadius)
    innerGradient.addColorStop(0, hexToRgba(glowColor, clampedGlowIntensity * 0.66))
    innerGradient.addColorStop(0.34, hexToRgba(glowColor, clampedGlowIntensity * 0.36))
    innerGradient.addColorStop(1, hexToRgba(glowColor, 0))

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerGlowRadius, 0, Math.PI * 2)
    ctx.roundRect(x, y, size, size, radius)
    ctx.clip("evenodd")
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerGlowRadius, 0, Math.PI * 2)
    ctx.fillStyle = innerGradient
    ctx.fill()
    ctx.restore()
  }

  if (clampedCoreAlpha > 0) {
    fillRoundedCell(
      ctx,
      x,
      y,
      size,
      radius,
      hexToRgba(fillColor, clampedCoreAlpha),
    )

    fillRoundedCell(
      ctx,
      x + innerInset,
      y + innerInset,
      Math.max(0.8, size - innerInset * 2),
      Math.max(1, radius - innerInset * 0.65),
      hexToRgba(blendColors(fillColor, "#ffffff", 0.12), clampedCoreAlpha * 0.08),
    )
  }
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
        drawGlowingCell(
          ctx,
          x,
          y,
          chipSize,
          radius,
          palette.trail,
          trailGlowColor,
          Math.min(0.72, trailMix * 1.18) * bloomScale,
          Math.min(0.62, trailMix * 0.84),
          cellSize,
          bloomRadius,
        )
      }

      if (liveMix > 0) {
        const scaledSize = chipSize * pulse
        const offset = (chipSize - scaledSize) / 2
        drawGlowingCell(
          ctx,
          x + offset,
          y + offset,
          scaledSize,
          radius,
          palette.cell,
          cellGlowColor,
          Math.min(1.08, 0.36 + liveMix * 1.12) * bloomScale,
          Math.min(1, 0.24 + liveMix * 0.9),
          cellSize,
          bloomRadius,
        )
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
  glowProgram: WebGLProgram
  coreProgram: WebGLProgram
  quadBuffer: WebGLBuffer
  pointBuffer: WebGLBuffer
  backgroundPositionLocation: number
  backgroundResolutionLocation: WebGLUniformLocation
  backgroundColorLocation: WebGLUniformLocation
  backgroundGridColorLocation: WebGLUniformLocation
  backgroundCellSizeLocation: WebGLUniformLocation
  backgroundGridStrengthLocation: WebGLUniformLocation
  glowPositionLocation: number
  glowSizeLocation: number
  glowColorLocation: number
  glowAuxLocation: number
  glowResolutionLocation: WebGLUniformLocation
  corePositionLocation: number
  coreSizeLocation: number
  coreColorLocation: number
  coreAuxLocation: number
  coreResolutionLocation: WebGLUniformLocation
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

const pointVertexShaderSource = `
  attribute vec2 a_center;
  attribute float a_size;
  attribute vec4 a_color;
  attribute float a_aux;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  varying float v_aux;
  varying float v_size;
  void main() {
    vec2 clip = (a_center / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = a_size;
    v_color = a_color;
    v_aux = a_aux;
    v_size = a_size;
  }
`

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

  const glowProgram = createProgram(
    gl,
    pointVertexShaderSource,
    `
      precision mediump float;
      varying vec4 v_color;
      varying float v_aux;
      varying float v_size;

      float squircleMask(vec2 p, float radius, float power, float edgeSoftness) {
        vec2 normalized = abs(p) / vec2(radius);
        float shape = pow(pow(normalized.x, power) + pow(normalized.y, power), 1.0 / power);
        return 1.0 - smoothstep(1.0 - edgeSoftness, 1.0, shape);
      }

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float edgeSoftness = clamp(2.4 / max(v_size, 1.0), 0.02, 0.24);
        float coreMask = squircleMask(uv / max(v_aux, 0.0001), 0.62, 3.6, edgeSoftness * 1.35);
        float innerMask = squircleMask(uv / max(v_aux, 0.0001), 0.46, 3.6, edgeSoftness * 1.35);
        float radial = length(uv);
        float halo = exp(-4.7 * radial * radial) * (1.0 - coreMask);
        float farHalo = exp(-2.0 * radial * radial) * (1.0 - innerMask);
        float alpha = clamp(halo * v_color.a * 1.35 + farHalo * v_color.a * 0.35, 0.0, 1.0);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(v_color.rgb, alpha);
      }
    `,
  )

  const coreProgram = createProgram(
    gl,
    pointVertexShaderSource,
    `
      precision mediump float;
      varying vec4 v_color;
      varying float v_size;

      float squircleMask(vec2 p, float radius, float power, float edgeSoftness) {
        vec2 normalized = abs(p) / vec2(radius);
        float shape = pow(pow(normalized.x, power) + pow(normalized.y, power), 1.0 / power);
        return 1.0 - smoothstep(1.0 - edgeSoftness, 1.0, shape);
      }

      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float edgeSoftness = clamp(1.3 / max(v_size, 1.0), 0.008, 0.16);
        float core = squircleMask(uv, 0.62, 3.6, edgeSoftness);
        float innerMask = squircleMask(uv, 0.46, 3.6, edgeSoftness * 1.1);
        float highlight = 1.0 - smoothstep(-0.24, 0.4, length(uv + vec2(-0.18, -0.18)));
        float alpha = core * v_color.a;
        if (alpha < 0.01) discard;
        vec3 color = v_color.rgb;
        color += mix(v_color.rgb, vec3(1.0), 0.03) * 0.015 * highlight * innerMask;
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
    glowProgram,
    coreProgram,
    quadBuffer,
    pointBuffer,
    backgroundPositionLocation: gl.getAttribLocation(backgroundProgram, "a_position"),
    backgroundResolutionLocation: gl.getUniformLocation(backgroundProgram, "u_resolution")!,
    backgroundColorLocation: gl.getUniformLocation(backgroundProgram, "u_background")!,
    backgroundGridColorLocation: gl.getUniformLocation(backgroundProgram, "u_grid")!,
    backgroundCellSizeLocation: gl.getUniformLocation(backgroundProgram, "u_cell_size")!,
    backgroundGridStrengthLocation: gl.getUniformLocation(backgroundProgram, "u_grid_strength")!,
    glowPositionLocation: gl.getAttribLocation(glowProgram, "a_center"),
    glowSizeLocation: gl.getAttribLocation(glowProgram, "a_size"),
    glowColorLocation: gl.getAttribLocation(glowProgram, "a_color"),
    glowAuxLocation: gl.getAttribLocation(glowProgram, "a_aux"),
    glowResolutionLocation: gl.getUniformLocation(glowProgram, "u_resolution")!,
    corePositionLocation: gl.getAttribLocation(coreProgram, "a_center"),
    coreSizeLocation: gl.getAttribLocation(coreProgram, "a_size"),
    coreColorLocation: gl.getAttribLocation(coreProgram, "a_color"),
    coreAuxLocation: gl.getAttribLocation(coreProgram, "a_aux"),
    coreResolutionLocation: gl.getUniformLocation(coreProgram, "u_resolution")!,
  }

  stageRendererCache.set(canvas, renderer)
  return renderer
}

function bindPointAttributes(
  gl: WebGLRenderingContext,
  positionLocation: number,
  sizeLocation: number,
  colorLocation: number,
  auxLocation: number,
) {
  const stride = 8 * Float32Array.BYTES_PER_ELEMENT

  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0)

  gl.enableVertexAttribArray(sizeLocation)
  gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT)

  gl.enableVertexAttribArray(colorLocation)
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT)

  gl.enableVertexAttribArray(auxLocation)
  gl.vertexAttribPointer(auxLocation, 1, gl.FLOAT, false, stride, 7 * Float32Array.BYTES_PER_ELEMENT)
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
  const basePointSize = Math.max(1.5, cellSize * renderScale * 0.84)
  const haloPadding = Math.max(0.34, bloomRadius) * Math.max(1.02, cellSize * renderScale * 0.16)
  const bloomScale = Math.max(0, bloomAmount)
  const liveGlowAlphaBase = (0.66 + 0.24 * Math.min(1, cellSize / 14)) * bloomScale
  const trailGlowAlphaBase = (0.36 + 0.14 * Math.min(1, cellSize / 14)) * bloomScale
  const pulse = 0.9 + transitionProgress * 0.1
  const glowData: number[] = []
  const coreData: number[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const currentAlive = snapshot.grid[row][col] ? 1 : 0
      const previousAlive = snapshot.previousGrid[row]?.[col] ? 1 : 0
      const liveMix = previousAlive + (currentAlive - previousAlive) * transitionProgress
      const trailMix = previousAlive && !currentAlive ? (1 - transitionProgress) * trailStrength : 0
      const cx = (col + 0.5) * cellSize * renderScale
      const cy = (row + 0.5) * cellSize * renderScale

      if (trailMix > 0) {
        const coreSize = basePointSize
        const glowSize = coreSize + haloPadding * 2
        glowData.push(
          cx,
          cy,
          glowSize,
          trailGlowRgb.r / 255,
          trailGlowRgb.g / 255,
          trailGlowRgb.b / 255,
          trailGlowAlphaBase * trailMix,
          coreSize / glowSize,
        )
        coreData.push(
          cx,
          cy,
          coreSize,
          trailRgb.r / 255,
          trailRgb.g / 255,
          trailRgb.b / 255,
          Math.min(0.62, trailMix * 0.84),
          0,
        )
      }

      if (liveMix > 0) {
        const coreSize = basePointSize * pulse
        const glowSize = coreSize + haloPadding * 2
        glowData.push(
          cx,
          cy,
          glowSize,
          cellGlowRgb.r / 255,
          cellGlowRgb.g / 255,
          cellGlowRgb.b / 255,
          liveGlowAlphaBase * Math.min(1, liveMix),
          coreSize / glowSize,
        )
        coreData.push(
          cx,
          cy,
          coreSize,
          cellRgb.r / 255,
          cellRgb.g / 255,
          cellRgb.b / 255,
          Math.min(1, 0.24 + liveMix * 0.9),
          0,
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
        coreData.push(
          (gridCol + 0.5) * cellSize * renderScale,
          (gridRow + 0.5) * cellSize * renderScale,
          basePointSize,
          overlayRgb.r / 255,
          overlayRgb.g / 255,
          overlayRgb.b / 255,
          Math.min(1, overlay.opacity),
          0,
        )
      })
    })
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.pointBuffer)

  if (glowData.length > 0) {
    gl.useProgram(renderer.glowProgram)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glowData), gl.DYNAMIC_DRAW)
    bindPointAttributes(
      gl,
      renderer.glowPositionLocation,
      renderer.glowSizeLocation,
      renderer.glowColorLocation,
      renderer.glowAuxLocation,
    )
    gl.uniform2f(renderer.glowResolutionLocation, deviceWidth, deviceHeight)
    gl.drawArrays(gl.POINTS, 0, glowData.length / 8)
  }

  if (coreData.length > 0) {
    gl.useProgram(renderer.coreProgram)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coreData), gl.DYNAMIC_DRAW)
    bindPointAttributes(
      gl,
      renderer.corePositionLocation,
      renderer.coreSizeLocation,
      renderer.coreColorLocation,
      renderer.coreAuxLocation,
    )
    gl.uniform2f(renderer.coreResolutionLocation, deviceWidth, deviceHeight)
    gl.drawArrays(gl.POINTS, 0, coreData.length / 8)
  }
}
