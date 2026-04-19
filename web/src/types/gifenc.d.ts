declare module "gifenc" {
  export type Palette = number[][]

  export interface GIFEncoderHandle {
    writeFrame(
      index: Uint8Array | Uint8ClampedArray | number[],
      width: number,
      height: number,
      options?: {
        palette?: Palette
        delay?: number
        repeat?: number
        transparent?: number
        first?: boolean
      },
    ): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(): GIFEncoderHandle
  export function quantize(
    pixels: Uint8ClampedArray | Uint8Array | number[],
    maxColors: number,
    options?: { format?: "rgb444" | "rgb565" | "rgba4444" },
  ): Palette
  export function applyPalette(
    pixels: Uint8ClampedArray | Uint8Array | number[],
    palette: Palette,
    format?: "rgb444" | "rgb565" | "rgba4444",
  ): Uint8Array
}
