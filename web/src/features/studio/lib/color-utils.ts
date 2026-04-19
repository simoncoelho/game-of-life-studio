export function hexToRgb(value: string) {
  const normalized = value.replace("#", "")
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((component) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, "0"))
    .join("")}`
}

export function blendColors(foreground: string, background: string, alpha: number) {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  return rgbToHex(
    Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  )
}

export function hexToRgba(value: string, alpha: number) {
  const { r, g, b } = hexToRgb(value)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
