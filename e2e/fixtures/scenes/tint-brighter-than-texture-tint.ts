/**
 * The tint the `tint-brighter-than-texture` scene's brighter sprite is
 * drawn with, on every channel. Kept in its own module, free of any `/src`
 * import, so `tint-brighter-than-texture.spec.ts` (which runs under Node,
 * not the Vite-bundled browser) can import it directly without dragging in
 * engine internals it can't parse (e.g. `.glsl` shader sources, only
 * loadable through Vite's browser build).
 */
export const brightTint = 1.5;
