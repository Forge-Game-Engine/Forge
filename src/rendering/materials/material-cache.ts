import { ForgeShaderSource } from '../index.js';
import { hashString, ProgramCache } from '../shaders/index.js';
import { Material } from './material.js';

/**
 * Reuses a single `Material` for identical `(vertexSource, fragmentSource)`
 * shader pairs, so systems that each need "a passthrough material" or "a
 * cross-fade material" share one `Material` (and its uniform bookkeeping)
 * instead of every system constructing its own. `createGaussianBlurEcsSystem`
 * and `createPresentEcsSystem`, for example, both need a plain passthrough
 * material and get the same instance back from this cache.
 *
 * Only safe for materials whose every uniform is set immediately before
 * each draw, which is true of full-screen pass materials (see
 * `fullscreen-pass.ts`). Do **not** use this for materials that carry
 * persistent per-instance uniform state relied on across many later draws,
 * such as a sprite's material: its texture uniform is set once, when the
 * sprite is created, not before every draw, so two sprites with different
 * textures must never share a cached `Material`, even though they use the
 * same shader pair.
 *
 * Each `RenderContext` owns its own `MaterialCache` (`RenderContext.materialCache`);
 * there is no shared global cache.
 */
export class MaterialCache {
  private readonly _materialsByKey: Map<string, Material> = new Map();

  /**
   * Returns the cached material for the given shader source pair, creating
   * (and compiling its program, via `programCache`) a new one the first
   * time it's requested.
   * @param vertexShaderSource - The vertex shader source.
   * @param fragmentShaderSource - The fragment shader source.
   * @param gl - The WebGL2 rendering context.
   * @param programCache - The program cache to compile through, typically `renderContext.programCache`.
   * @returns The cached (or newly created) material.
   */
  public getMaterial(
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
    gl: WebGL2RenderingContext,
    programCache: ProgramCache,
  ): Material {
    const key = `${hashString(vertexShaderSource.preparedSource)}:${hashString(fragmentShaderSource.preparedSource)}`;
    const cachedMaterial = this._materialsByKey.get(key);

    if (cachedMaterial) {
      return cachedMaterial;
    }

    const material = new Material(
      vertexShaderSource,
      fragmentShaderSource,
      gl,
      programCache,
    );

    this._materialsByKey.set(key, material);

    return material;
  }
}
