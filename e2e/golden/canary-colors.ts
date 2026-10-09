// Shared by the canary scene and its spec. The spec runs under Node, which
// can't load `/src` (its shader imports need Vite), so this module imports
// nothing.

/** An opaque color, `0`-`255` per channel. */
export interface Rgb8 {
  r: number;
  g: number;
  b: number;
}

/**
 * The canary's colors. Each channel is a multiple of 51 (`0.2` steps), which
 * 8 bits store exactly, so the expected pixels have no rounding to argue
 * about.
 */
export const canaryColors = {
  clear: { r: 51, g: 102, b: 153 },
  quad: { r: 255, g: 204, b: 0 },
} as const satisfies Record<string, Rgb8>;

/** The canary quad's size, in CSS pixels, centered on the canvas. */
export const canaryQuadSize = { width: 120, height: 80 } as const;
