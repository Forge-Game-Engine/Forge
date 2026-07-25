/**
 * The `camera-pan-zoom` scene's clear color, as plain numbers. Kept in its
 * own module, free of any `/src` import, so `camera-pan-zoom.spec.ts` (which
 * runs under Node, not the Vite-bundled browser) can import it directly
 * without dragging in engine internals it can't parse (e.g. `.glsl` shader
 * sources, only loadable through Vite's browser build).
 */
export const clearColorRgb = { r: 0.2, g: 0.4, b: 0.8 };
