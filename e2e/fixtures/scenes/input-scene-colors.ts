/**
 * Plain 0-255 RGB constants for the input scenes' landmark sprites, kept
 * free of any `/src` import (see `camera-pan-zoom-clear-color.ts` for why:
 * specs run under Node, which can't parse `/src`'s `.glsl` shader imports).
 * Scenes build the matching `Color` (0-1 float) instances themselves; specs
 * use these directly with `matchesColor` from `input-scene-helpers.ts`.
 * Chosen to be maximally distinct from each other and from `clearColorRgb`
 * so `matchesColor`'s tolerance never confuses one landmark for another.
 */
export const inputSceneColors = {
  clear: { r: 20, g: 20, b: 20 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  orange: { r: 255, g: 140, b: 0 },
  magenta: { r: 255, g: 0, b: 255 },
  cyan: { r: 0, g: 255, b: 255 },
} as const;
