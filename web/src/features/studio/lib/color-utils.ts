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

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness }
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  let hue = 0
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0)
      break
    case green:
      hue = (blue - red) / delta + 2
      break
    default:
      hue = (red - green) / delta + 4
      break
  }

  return { h: hue / 6, s: saturation, l: lightness }
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const value = Math.round(l * 255)
    return { r: value, g: value, b: value }
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let temp = t
    if (temp < 0) temp += 1
    if (temp > 1) temp -= 1
    if (temp < 1 / 6) return p + (q - p) * 6 * temp
    if (temp < 1 / 2) return q
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  }
}

export function boostGlowColor(value: string) {
  const { r, g, b } = hexToRgb(value)
  const { h, s, l } = rgbToHsl(r, g, b)
  const isWarm = h < 0.16 || h > 0.94
  const boosted = hslToRgb(
    isWarm ? Math.max(0.04, Math.min(0.09, h)) : h,
    Math.min(1, s * 1.5 + 0.12),
    Math.min(isWarm ? 0.78 : 0.74, l + (isWarm ? 0.2 : 0.14)),
  )
  return rgbToHex(boosted.r, boosted.g, boosted.b)
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
