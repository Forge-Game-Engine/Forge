import { ImageCache } from '../asset-loading';
import { ShaderCache } from './shaders';
import { createShaderCache } from './utilities';

/**
 * Represents the rendering context containing WebGL context, shader store, and layer service.
 */
export class RenderContext {
  /**
   * The shader store containing compiled shaders.
   */
  public readonly shaderCache: ShaderCache;

  /**
   * The image cache containing loaded images.
   */
  public readonly imageCache: ImageCache;

  /**
   * Constructs a new instance of the `RenderContext` class.
   * @param gl - The WebGL2 rendering context.
   * @param shaderCache - The shader cache.
   * @param imageCache - The image cache.
   * @param layerService - The layer service.
   */
  constructor(shaderCache: ShaderCache, imageCache: ImageCache) {
    this.shaderCache = shaderCache;
    this.imageCache = imageCache;
  }
}

export interface RenderContextOptions {
  shaderCache?: ShaderCache;
  imageCache?: ImageCache;
}

export function createRenderContext(
  options: RenderContextOptions = {},
): RenderContext {
  const { shaderCache, imageCache } = options;

  return new RenderContext(
    shaderCache ?? createShaderCache(),
    imageCache ?? new ImageCache(),
  );
}
