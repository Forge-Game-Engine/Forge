/**
 * The `trail` scene's numbers. Kept in their own module, free of any `/src`
 * import, so `trail.spec.ts` (which runs under Node, not the Vite-bundled
 * browser) can import them without dragging in engine internals it can't
 * parse (e.g. `.glsl` shader sources).
 */

/** How fast the entity moves along `+X`, in world units a second. */
export const trailSpeed = 2;

/** The trail's lifetime, in seconds. */
export const trailLifetimeSeconds = 1;

/** The width of the entity's square sprite, in world units. */
export const trailSpriteWidth = 0.5;
