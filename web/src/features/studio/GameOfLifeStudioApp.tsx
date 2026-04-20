import { useEffect, useMemo, useRef, useState } from "react"
import {
  BrushCleaning,
  Captions,
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  Move,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  StepBack,
  StepForward,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CompactColorField,
  CompactToggle,
  Field,
  InfoRow,
  PanelBlock,
  SliderField,
} from "@/features/studio/components/StudioControlPrimitives"
import {
  DEFAULT_COLS,
  DEFAULT_GIF_FILENAME,
  DEFAULT_ROWS,
  DEFAULT_TEXT_SCALE,
  DEFAULT_TEXT_SEED,
} from "@/features/studio/constants/defaults"
import { palettes, rules, scenes, tools } from "@/features/studio/constants/presets"
import { buildGifBlob } from "@/features/studio/lib/export-gif"
import {
  cloneGrid,
  countLive,
  createEmptyGrid,
  makeSnapshot,
  nextGridState,
  randomizeGrid,
  resizeGrid,
} from "@/features/studio/lib/grid-utils"
import {
  applyPattern,
  buildTextPattern,
  createSeededTextGrid,
  scalePattern,
} from "@/features/studio/lib/pattern-utils"
import { createSceneSeedGrid } from "@/features/studio/lib/scene-seed-utils"
import { renderStageWebGL } from "@/features/studio/lib/render-stage"
import { toolButtonClass } from "@/features/studio/lib/studio-control-styles"
import type { ScenePreset, Snapshot } from "@/features/studio/types"

function GameOfLifeStudioApp() {
  const defaultScene = scenes[0]
  const defaultRule = rules.find((rule) => rule.key === defaultScene.ruleKey) ?? rules[0]
  const defaultPalette = palettes.find((palette) => palette.key === defaultScene.paletteKey) ?? palettes[0]
  const initialGrid =
    defaultScene.seedMode === "title"
      ? createSeededTextGrid(DEFAULT_ROWS, DEFAULT_COLS, DEFAULT_TEXT_SEED, DEFAULT_TEXT_SCALE)
      : createSceneSeedGrid(DEFAULT_ROWS, DEFAULT_COLS, defaultScene.seedMode, defaultScene.density)

  const [workflowTab, setWorkflowTab] = useState<"scene" | "review">("scene")
  const [sceneTab, setSceneTab] = useState<"scene" | "colors">("scene")

  const [sceneKey, setSceneKey] = useState(defaultScene.key)
  const [paletteKey, setPaletteKey] = useState(defaultPalette.key)
  const [ruleKey, setRuleKey] = useState(defaultRule.key)
  const [birthText, setBirthText] = useState(defaultRule.birth.join(""))
  const [surviveText, setSurviveText] = useState(defaultRule.survive.join(""))
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [cols, setCols] = useState(DEFAULT_COLS)
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
  const [textSeed, setTextSeed] = useState(DEFAULT_TEXT_SEED)
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE)
  const [textOffsetX, setTextOffsetX] = useState(0)
  const [textOffsetY, setTextOffsetY] = useState(0)
  const [noiseAmount, setNoiseAmount] = useState(0.12)
  const [toolKey, setToolKey] = useState(tools[0].key)
  const [toolScale, setToolScale] = useState(1)
  const [gifFrames, setGifFrames] = useState(90)
  const [gifStepSize, setGifStepSize] = useState(1)
  const [gifFps, setGifFps] = useState(16)
  const [gifScale, setGifScale] = useState(2)
  const [gifFilename, setGifFilename] = useState(DEFAULT_GIF_FILENAME)
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
  const [previousGrid, setPreviousGrid] = useState<number[][]>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS))
  const [generation, setGeneration] = useState(0)
  const [liveCells, setLiveCells] = useState(() => countLive(initialGrid))
  const [dragMode, setDragMode] = useState<0 | 1 | null>(null)
  const [startingSnapshot, setStartingSnapshot] = useState<Snapshot>(() =>
    makeSnapshot(initialGrid, createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS), 0),
  )

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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

  function buildGridForScene(activeScene: ScenePreset | undefined, nextDensity: number) {
    if (!activeScene) {
      return randomizeGrid(rows, cols, nextDensity)
    }

    if (activeScene.seedMode === "title") {
      const seedText = textSeed.trim() ? textSeed : DEFAULT_TEXT_SEED
      const seedScale = Math.max(1, Math.round(textScale))
      return createSeededTextGrid(rows, cols, seedText, seedScale, textOffsetX, textOffsetY)
    }

    return createSceneSeedGrid(rows, cols, activeScene.seedMode, nextDensity)
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
    if (preset.seedMode === "title") {
      setTextSeed(DEFAULT_TEXT_SEED)
      setTextScale(DEFAULT_TEXT_SCALE)
      setTextOffsetX(0)
      setTextOffsetY(0)
      const nextGrid = createSeededTextGrid(rows, cols, DEFAULT_TEXT_SEED, DEFAULT_TEXT_SCALE)
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
    const nextGrid = createSceneSeedGrid(rows, cols, preset.seedMode, preset.density)
    const nextPrevious = createEmptyGrid(rows, cols)
    gridRef.current = nextGrid
    previousGridRef.current = nextPrevious
    generationRef.current = 0
    liveCellsRef.current = countLive(nextGrid)
    setGrid(nextGrid)
    setPreviousGrid(nextPrevious)
    setGeneration(0)
    setLiveCells(liveCellsRef.current)
    invalidatePreview(`${preset.label} scene applied.`)
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
    const activeScene = scenes.find((scene) => scene.key === sceneKey)
    const nextGrid = buildGridForScene(activeScene, nextDensity)
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

    const blob = buildGifBlob({
      snapshots: previewFrames,
      palette: activePalette,
      cellSize,
      gifScale,
      showGrid,
      gridContrast,
      trailStrength,
      bloomAmount,
      bloomRadius,
      fps: gifFps,
      overlay: exportOverlay,
    })
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
                <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-xl">
                  <div className="grid w-full grid-cols-2 gap-1 p-1">
                    <button
                      type="button"
                      className={
                        workflowTab === "scene"
                          ? "min-h-8 rounded-lg bg-primary px-2.5 py-2 text-center text-xs font-semibold leading-none text-primary-foreground shadow-sm"
                          : "min-h-8 rounded-lg px-2.5 py-2 text-center text-xs font-medium leading-none text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                      }
                      onClick={() => setWorkflowTab("scene")}
                    >
                      Scene Setup
                    </button>
                    <button
                      type="button"
                      className={
                        workflowTab === "review"
                          ? "min-h-8 rounded-lg bg-primary px-2.5 py-2 text-center text-xs font-semibold leading-none text-primary-foreground shadow-sm"
                          : "min-h-8 rounded-lg px-2.5 py-2 text-center text-xs font-medium leading-none text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                      }
                      onClick={() => setWorkflowTab("review")}
                    >
                      Preview / Export
                    </button>
                  </div>
                  {workflowTab === "scene" ? (
                    <div className="grid w-full grid-cols-2 gap-1 border-t border-border/70 p-1 pt-0.5">
                      <button
                        type="button"
                        className={
                          sceneTab === "scene"
                            ? "min-h-8 rounded-lg bg-secondary px-2.5 py-2 text-center text-xs font-semibold leading-none text-secondary-foreground"
                            : "min-h-8 rounded-lg px-2.5 py-2 text-center text-xs font-medium leading-none text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                        }
                        onClick={() => setSceneTab("scene")}
                      >
                        Scene
                      </button>
                      <button
                        type="button"
                        className={
                          sceneTab === "colors"
                            ? "min-h-8 rounded-lg bg-secondary px-2.5 py-2 text-center text-xs font-semibold leading-none text-secondary-foreground"
                            : "min-h-8 rounded-lg px-2.5 py-2 text-center text-xs font-medium leading-none text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                        }
                        onClick={() => setSceneTab("colors")}
                      >
                        Colors
                      </button>
                    </div>
                  ) : null}
                </div>
                {workflowTab === "scene" ? (
                  sceneTab === "scene" ? (
                    <div className="space-y-4">
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
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                    </div>
                  )
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
                      <button type="button" className={`${toolButtonClass(false)} ml-1`} onClick={resetScene}>
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
      </div>
    </TooltipProvider>
  )
}

export default GameOfLifeStudioApp
