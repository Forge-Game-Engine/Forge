import { ImageCache } from '../asset-loading';
import { CLEAR_STRATEGY, CLEAR_STRATEGY_KEYS } from './enums';
import { UniformValue } from './materials';
import { ShaderCache } from './shaders';
import { createShaderCache } from './utilities';

/**
 * The rendering context.
 */
export class RenderContext {
  /** The strategy for clearing the render context. */
  public clearStrategy: CLEAR_STRATEGY_KEYS;

  /**
   * The shader store containing compiled shaders.
   */
  public readonly shaderCache: ShaderCache;

  /**
   * The image cache containing loaded images.
   */
  public readonly imageCache: ImageCache;

  /** The canvas element associated with the render context. */
  public readonly canvas: HTMLCanvasElement;

  /** The WebGL2 rendering context. */
  public readonly gl: WebGL2RenderingContext;

  public instanceBuffer: WebGLBuffer;

  private readonly _globalUniformValues: Map<string, UniformValue>;

  /**
   * Constructs a new instance of the `RenderContext` class.
   * @param shaderCache - The shader cache.
   * @param imageCache - The image cache.
   * @param canvas - The canvas element.
   * @param clearStrategy - The strategy for clearing the render context (default: CLEAR_STRATEGY.blank).
   */
  constructor(
    shaderCache: ShaderCache,
    imageCache: ImageCache,
    canvas: HTMLCanvasElement,
    clearStrategy: CLEAR_STRATEGY_KEYS = CLEAR_STRATEGY.blank,
  ) {
    this.shaderCache = shaderCache;
    this.imageCache = imageCache;
    this.canvas = canvas;
    this.clearStrategy = clearStrategy;

    const context = canvas.getContext('webgl2', { antialias: true });

    if (!context) {
      throw new Error('Context not found');
    }

    this.gl = context;
    this.instanceBuffer = context.createBuffer();
    this._globalUniformValues = new Map<string, UniformValue>();
  }

  public setGlobalUniformValue(name: string, value: UniformValue): void {
    this._globalUniformValues.set(name, value);
  }

  // eslint-disable-next-line sonarjs/function-return-type
  public getGlobalUniformValue(name: string): UniformValue {
    if (!this._globalUniformValues.has(name)) {
      throw new Error(`Global uniform value not found: ${name}`);
    }

    return this._globalUniformValues.get(name)!;
  }
}

export interface RenderContextOptions {
  canvas: HTMLCanvasElement;
  shaderCache?: ShaderCache;
  imageCache?: ImageCache;
  clearStrategy?: CLEAR_STRATEGY_KEYS;
}

export function createRenderContext(
  options: RenderContextOptions,
): RenderContext {
  const { shaderCache, imageCache, canvas, clearStrategy } = options;

  return new RenderContext(
    shaderCache ?? createShaderCache(),
    imageCache ?? new ImageCache(),
    canvas,
    clearStrategy,
  );
}
