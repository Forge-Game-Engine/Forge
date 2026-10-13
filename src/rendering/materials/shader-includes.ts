/**
 * The shader include every sprite and mesh fragment shader applies masks
 * with: its `maskCoverage()` is how much of the fragment the masks above
 * what's drawn let through.
 */
export const maskShaderIncludeName = 'mask';

/**
 * Whether a prepared shader source includes (or is) the named shader
 * include. Prepared sources keep their `#pragma forge include(...)` lines
 * when no include pre-processor resolved them, and a resolved include
 * brings its own `#pragma forge name(...)` with it, so either counts.
 * @param preparedSource - The shader's prepared source.
 * @param includeName - The include's name, from its `#pragma forge name(...)`.
 * @returns `true` if the source includes it.
 */
export const includesShader = (
  preparedSource: string,
  includeName: string,
): boolean =>
  new RegExp(
    String.raw`#pragma\s+forge\s+(?:name|include)\s*\(\s*${includeName}\s*\)`,
  ).test(preparedSource);
