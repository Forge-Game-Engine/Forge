import { ImageCache } from '../asset-loading/index.js';
import { Resizable } from '../common/index.js';
import { ForgeEvent } from '../events/index.js';
import { Color } from './color.js';
import { CLEAR_STRATEGY, CLEAR_STRATEGY_KEYS } from './enums/index.js';
import { createQuadGeometry } from './geometry/create-quad-geometry.js';
import type { Geometry } from './geometry/geometry.js';
import { rebuildGpuResources } from './gpu-resource-registry.js';
import { ShaderProgram } from './materials/shader-program.js';
import { SpriteMaterial } from './materials/sprite-material.js';
import { UniformValue } from './materials/uniform-value.js';
import { OwnedTexture } from './owned-texture.js';
import { resizeCanvasSizedRenderTargets } from './render-target-registry.js';
import { RenderTarget } from './render-target.js';
import type { ForgeShaderSource } from './shaders/pre-processing/forge-shader-source.js';
import { ShaderCache } from './shaders/pre-processing/dependency-resolution/shader-cache.js';
import type { Texture } from './texture.js';
import { createShaderCache, getDevicePixelRatio } from './utilities/index.js';

/**
 * Converts a CSS-pixel length to the drawing-buffer length that renders it at
 * `pixelRatio` device pixels per CSS pixel. Rounded, since a canvas's backing
 * store can only be a whole number of pixels, but never rounded all the way
 * down to `0` for a non-empty canvas.
 */
function toDrawingBufferSize(cssSize: number, pixelRatio: number): number {
  if (cssSize <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(cssSize * pixelRatio));
}

function assertValidPixelRatio(name: string, value: number): void {
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(
      `Render context ${name} must be a positive number, received ${value}.`,
    );
  }
}

/**
 * The rendering context.
 */
export class RenderContext implements Resizable {
  /**
   * Whether `clear` clears the bound destination. `CLEAR_STRATEGY.blank`
   * (the default) clears it; `CLEAR_STRATEGY.none` makes `clear` do
   * nothing, so cameras and full-screen passes draw over what the
   * destination already holds.
   */
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

  /**
   * Raised when the browser takes the WebGL context away (after a GPU
   * reset, or when the device runs low on memory), once
   * {@link RenderContext.isContextLost} is `true`. Nothing is drawn until
   * the context is restored, but the game keeps running, and creating
   * materials, textures, render targets and geometry keeps working. A game
   * that wants to recover with cheaper settings lowers them here (e.g.
   * {@link RenderContext.maxPixelRatio}).
   */
  public readonly onContextLost: ForgeEvent;

  /**
   * Raised once the WebGL context is back and every GPU resource the
   * engine created (programs, textures, render targets, geometry) has been
   * rebuilt, and {@link RenderContext.isContextLost} is `false` again. The
   * next frame draws normally. A game that created raw WebGL objects of its
   * own recreates them here.
   */
  public readonly onContextRestored: ForgeEvent;

  private readonly _globalUniformValues: Map<string, UniformValue>;
  // Strong, like the GPU resource registry: every program the render
  // context links is linked again when a lost context is restored.
  private readonly _shaderPrograms = new Map<
    ForgeShaderSource,
    Map<ForgeShaderSource, ShaderProgram>
  >();
  private _instanceBuffer: WebGLBuffer;
  private _supportsHdrRenderTargets: boolean;
  private _isContextLost: boolean;
  private _whiteTexture: OwnedTexture | null = null;
  private _blackTexture: OwnedTexture | null = null;
  private _quadGeometry: Geometry | null = null;
  private _spriteMaterial: SpriteMaterial | null = null;
  private _width: number;
  private _height: number;
  private _cssWidth: number;
  private _cssHeight: number;
  private _pixelRatio: number;
  private _maxPixelRatio: number;
  private _devicePixelRatio: number;

  /**
   * Constructs a new instance of the `RenderContext` class.
   * @param shaderCache - The shader cache.
   * @param imageCache - The image cache.
   * @param canvas - The canvas element.
   * @param clearStrategy - The strategy for clearing the render context (default: CLEAR_STRATEGY.blank).
   * @param preserveDrawingBuffer - Whether to retain the drawing buffer after presentation instead of letting the browser clear it, required for reading back the canvas's pixels (e.g. `toDataURL`, `drawImage`) after a frame has already been presented (default: false, since most consumers never read the canvas back and the retained buffer costs GPU memory bandwidth).
   * @param maxPixelRatio - The highest `pixelRatio` to render at (default: no limit). See `maxPixelRatio`.
   * @remarks The canvas's current on-page size (or, if it hasn't been laid out yet, its `width`/`height` attributes - the size an unstyled canvas is shown at) is taken as its CSS size. Its CSS size is then pinned via `style.width`/`style.height` and its drawing buffer is resized to that times the display's current `devicePixelRatio` (clamped to `maxPixelRatio`), so it renders at native resolution from the first frame.
   * @throws An error if `maxPixelRatio` is not a positive number.
   */
  constructor(
    shaderCache: ShaderCache,
    imageCache: ImageCache,
    canvas: HTMLCanvasElement,
    clearStrategy: CLEAR_STRATEGY_KEYS = CLEAR_STRATEGY.blank,
    preserveDrawingBuffer: boolean = false,
    maxPixelRatio: number = Number.POSITIVE_INFINITY,
  ) {
    assertValidPixelRatio('maxPixelRatio', maxPixelRatio);

    this.shaderCache = shaderCache;
    this.imageCache = imageCache;
    this.canvas = canvas;
    this.clearStrategy = clearStrategy;
    this._maxPixelRatio = maxPixelRatio;
    this._devicePixelRatio = getDevicePixelRatio();
    this._pixelRatio = Math.min(this._devicePixelRatio, maxPixelRatio);
    this._cssWidth = canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
    this._cssHeight =
      canvas.clientHeight > 0 ? canvas.clientHeight : canvas.height;
    this._width = toDrawingBufferSize(this._cssWidth, this._pixelRatio);
    this._height = toDrawingBufferSize(this._cssHeight, this._pixelRatio);

    // Sized before `getContext`, so the context's initial viewport already
    // matches the drawing buffer.
    canvas.width = this._width;
    canvas.height = this._height;
    canvas.style.width = `${this._cssWidth}px`;
    canvas.style.height = `${this._cssHeight}px`;

    const context = canvas.getContext('webgl2', {
      antialias: true,
      preserveDrawingBuffer,
    });

    if (!context) {
      throw new Error('Context not found');
    }

    this.gl = context;
    this.onContextLost = new ForgeEvent('contextLost');
    this.onContextRestored = new ForgeEvent('contextRestored');
    this._instanceBuffer = context.createBuffer();
    this._supportsHdrRenderTargets = this._requestExtensions();
    this._isContextLost = false;
    this._globalUniformValues = new Map<string, UniformValue>();

    canvas.addEventListener('webglcontextlost', (event) => {
      // Without this the browser never gives the context back.
      event.preventDefault();
      this._isContextLost = true;
      this.onContextLost.raise();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this._restore();
    });
  }

  /**
   * Whether the WebGL context is lost: `true` from the moment the browser
   * takes it away until the engine has rebuilt its GPU resources after the
   * browser gives it back (just before `onContextRestored` is raised).
   *
   * While it's lost nothing is drawn, and creating or resizing a material,
   * texture, render target or geometry records what to create and touches
   * no WebGL state; the restore creates it.
   */
  get isContextLost(): boolean {
    return this._isContextLost || this.gl.isContextLost();
  }

  /**
   * Whether render targets can store HDR (half-float) color, which needs
   * the `EXT_color_buffer_float` extension. A render target that asks for
   * `RENDER_TARGET_FORMAT.hdr` without it falls back to `ldr`.
   */
  get supportsHdrRenderTargets(): boolean {
    return this._supportsHdrRenderTargets;
  }

  /**
   * The buffer the render system streams each batch's per-instance data
   * into. Owned by the render context, and recreated when a lost context is
   * restored, so read it when drawing rather than keeping it.
   */
  get instanceBuffer(): WebGLBuffer {
    return this._instanceBuffer;
  }

  /**
   * A quad covering clip space (`-1` to `1`) with texture coordinates from
   * `0` to `1`, as `a_position` and `a_texCoord`: what every sprite instance
   * and every full-screen pass is drawn from. Owned by the render context.
   */
  get quadGeometry(): Geometry {
    this._quadGeometry ??= createQuadGeometry(this);

    return this._quadGeometry;
  }

  /**
   * The drawing buffer's width - the canvas's backing store, i.e. the
   * resolution everything is actually rendered at - in device pixels:
   * `cssWidth * pixelRatio`, rounded. This is the size the WebGL viewport
   * uses, so size anything that's rendered into and then shown on the canvas
   * (a shader uniform compared against `gl_FragCoord`) from this, not from
   * `cssWidth`. A render target that covers the canvas is created
   * canvas-sized instead (see `createRenderTarget`), so it follows this
   * size by itself. Changed only by `resize`.
   */
  get width(): number {
    return this._width;
  }

  /**
   * The drawing buffer's height, in device pixels. See `width`.
   */
  get height(): number {
    return this._height;
  }

  /**
   * The canvas's on-page (layout) width, in CSS pixels. DOM measurements -
   * `MouseInputSource.position`, `getSafeAreaInsets()` - are in CSS pixels,
   * so convert them against `cssWidth`/`cssHeight` rather than
   * `width`/`height`, which are larger by `pixelRatio`. Changed only by
   * `resize`.
   */
  get cssWidth(): number {
    return this._cssWidth;
  }

  /**
   * The canvas's on-page (layout) height, in CSS pixels. See `cssWidth`.
   */
  get cssHeight(): number {
    return this._cssHeight;
  }

  /**
   * How many drawing-buffer (device) pixels the canvas currently has per CSS
   * pixel: the display's `devicePixelRatio` as of the last resize, clamped to
   * `maxPixelRatio`. `2` on a typical HiDPI/Retina display, so the canvas
   * renders at the display's native resolution instead of being upscaled
   * (and blurred) by the browser. Changed only by `resize` (which setting
   * `maxPixelRatio` calls).
   */
  get pixelRatio(): number {
    return this._pixelRatio;
  }

  /**
   * The highest `pixelRatio` this render context will use, however dense
   * the display is (default: no limit). Rendering cost grows with the
   * square of the pixel ratio, so a fill-rate-heavy game can cap it (e.g. at
   * `2` for 3x phone displays, or at `1` to always render at CSS
   * resolution), and change it at runtime, as a graphics-quality setting or
   * from its own frame-time measurements.
   *
   * Setting it re-applies the last `resize` at the new cap, against the
   * display's device pixel ratio as of that resize, so the canvas and every
   * canvas-sized render target re-render at the new resolution from the
   * next frame. While the canvas has no size (e.g. its container is hidden)
   * the cap is only remembered, and applies on the next `resize`.
   * @throws An error if set to anything but a positive number.
   */
  get maxPixelRatio(): number {
    return this._maxPixelRatio;
  }

  set maxPixelRatio(value: number) {
    assertValidPixelRatio('maxPixelRatio', value);

    this._maxPixelRatio = value;

    if (this._cssWidth <= 0 || this._cssHeight <= 0) {
      return;
    }

    this.resize(this._cssWidth, this._cssHeight, this._devicePixelRatio);
  }

  /**
   * Resizes the canvas to `cssWidth` x `cssHeight` CSS pixels on the page,
   * with a drawing buffer of that size times `devicePixelRatio` (clamped to
   * `maxPixelRatio`), updates the WebGL viewport to match, and resizes every
   * canvas-sized render target (see `createRenderTarget`), so none is ever
   * out of step with the canvas for a frame.
   *
   * Does nothing if neither the CSS size nor the resulting drawing-buffer
   * size would change - assigning a canvas's `width`/`height` clears its
   * contents even when the value is the same, so repeated calls with an
   * unchanged size are safe.
   * @param cssWidth - The new on-page width, in CSS pixels.
   * @param cssHeight - The new on-page height, in CSS pixels.
   * @param devicePixelRatio - Device pixels per CSS pixel on the display the canvas is shown on (default: the browser's current `window.devicePixelRatio`). Remembered, so setting `maxPixelRatio` later re-applies it.
   * @throws An error if any argument is not a positive number.
   */
  public resize(
    cssWidth: number,
    cssHeight: number,
    devicePixelRatio: number = getDevicePixelRatio(),
  ): void {
    if (
      Number.isNaN(cssWidth) ||
      Number.isNaN(cssHeight) ||
      cssWidth <= 0 ||
      cssHeight <= 0
    ) {
      throw new Error('Render context dimensions must be positive numbers.');
    }

    assertValidPixelRatio('devicePixelRatio', devicePixelRatio);

    const pixelRatio = Math.min(devicePixelRatio, this._maxPixelRatio);
    const width = toDrawingBufferSize(cssWidth, pixelRatio);
    const height = toDrawingBufferSize(cssHeight, pixelRatio);

    this._devicePixelRatio = devicePixelRatio;
    this._pixelRatio = pixelRatio;

    if (
      cssWidth === this._cssWidth &&
      cssHeight === this._cssHeight &&
      width === this._width &&
      height === this._height
    ) {
      return;
    }

    const isDrawingBufferResized =
      width !== this._width || height !== this._height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.gl.viewport(0, 0, width, height);
    this._width = width;
    this._height = height;
    this._cssWidth = cssWidth;
    this._cssHeight = cssHeight;

    if (isDrawingBufferResized) {
      resizeCanvasSizedRenderTargets(this);
    }
  }

  /**
   * Binds a render target as the current draw destination, or the default
   * framebuffer (the canvas) if `null` is passed. Updates the viewport to
   * match the bound target's dimensions.
   * @param target - The render target to bind, or `null` to bind the canvas.
   */
  public bindRenderTarget(target: RenderTarget | null): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target?.framebuffer ?? null);
    this.gl.viewport(
      0,
      0,
      target?.width ?? this._width,
      target?.height ?? this._height,
    );
  }

  /**
   * Clears the currently bound framebuffer's color buffer, according to `clearStrategy`.
   * @param color - The (straight, non-premultiplied alpha) color to clear to.
   * Written premultiplied, matching the premultiplied-alpha color every
   * render target and the canvas hold (see `createRenderEcsSystem`).
   * Defaults to `Color.transparent`.
   */
  public clear(color: Color = Color.transparent): void {
    if (this.clearStrategy === CLEAR_STRATEGY.none) {
      return;
    }

    const { r, g, b, a } = color;

    // Premultiplied: a translucent clear color written as-is would end up
    // brighter than intended once presented, since the present pass treats
    // a render target's color as already premultiplied by its alpha.
    this.gl.clearColor(r * a, g * a, b * a, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * A 1x1 opaque white texture, for a sprite drawn as a solid color: the
   * sprite shader multiplies the texture by `tintColor`, so white leaves the
   * tint as it is. Owned by the render context.
   */
  get whiteTexture(): Texture {
    this._whiteTexture ??= OwnedTexture.createSolidColor(
      this,
      [255, 255, 255, 255],
    );

    return this._whiteTexture;
  }

  /**
   * A 1x1 opaque black texture: what a sampler a material hasn't set
   * samples, and the emissive map of a sprite without one. Owned by the
   * render context.
   */
  get blackTexture(): Texture {
    this._blackTexture ??= OwnedTexture.createSolidColor(this, [0, 0, 0, 255]);

    return this._blackTexture;
  }

  /**
   * The material every sprite without its own `material` draws with
   * (`sprite.vert` + `sprite.frag`), shared by all of them.
   */
  get spriteMaterial(): SpriteMaterial {
    this._spriteMaterial ??= new SpriteMaterial(this, 'sprite.frag');

    return this._spriteMaterial;
  }

  /**
   * Returns the linked program for a vertex and fragment shader pair,
   * compiling and linking it the first time the pair is asked for. Every
   * `Material` made from the same two shader sources shares it. Asked for
   * while the context is lost, the program is linked when the context is
   * restored.
   * @param vertexShaderSource - The vertex shader source.
   * @param fragmentShaderSource - The fragment shader source.
   * @returns The shared program.
   * @throws An error if a shader fails to compile or link, if the two
   * shaders declare the same uniform with different types or sizes, or if
   * they declare a sampler other than `sampler2D`.
   */
  public getShaderProgram(
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
  ): ShaderProgram {
    let programsByFragment = this._shaderPrograms.get(vertexShaderSource);

    if (!programsByFragment) {
      programsByFragment = new Map();
      this._shaderPrograms.set(vertexShaderSource, programsByFragment);
    }

    let shaderProgram = programsByFragment.get(fragmentShaderSource);

    if (!shaderProgram) {
      shaderProgram = new ShaderProgram(
        this,
        vertexShaderSource,
        fragmentShaderSource,
      );
      programsByFragment.set(fragmentShaderSource, shaderProgram);
    }

    return shaderProgram;
  }

  public setGlobalUniformValue(name: string, value: UniformValue): void {
    this._globalUniformValues.set(name, value);
  }

  public getGlobalUniformValue(name: string): UniformValue {
    if (!this._globalUniformValues.has(name)) {
      throw new Error(`Global uniform value not found: ${name}`);
    }

    return this._globalUniformValues.get(name)!;
  }

  /**
   * Re-requests the extensions the context lost with it, links every
   * program, rebuilds every other GPU resource, then raises
   * `onContextRestored`. A resource that fails to rebuild doesn't stop the
   * rest: the event is still raised, and the failures are thrown together
   * afterwards.
   */
  private _restore(): void {
    // Cleared first, so the rebuild runs against a live context with its
    // compile, link and framebuffer checks on. Nothing else runs until the
    // rebuild is done, so no one sees the flag cleared early.
    this._isContextLost = false;
    this._supportsHdrRenderTargets = this._requestExtensions();
    this._instanceBuffer = this.gl.createBuffer();

    const errors: unknown[] = [];

    for (const programsByFragment of this._shaderPrograms.values()) {
      for (const shaderProgram of programsByFragment.values()) {
        try {
          shaderProgram.link();
        } catch (error) {
          errors.push(error);
        }
      }
    }

    errors.push(...rebuildGpuResources(this));

    this.onContextRestored.raise();

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Some GPU resources could not be rebuilt after the WebGL context was restored.',
      );
    }
  }

  /**
   * Requests the extensions the engine uses. Extensions are lost with the
   * context, so this runs again on every restore.
   * @returns Whether `EXT_color_buffer_float` is available.
   */
  private _requestExtensions(): boolean {
    return this.gl.getExtension('EXT_color_buffer_float') !== null;
  }
}

/**
 * Options for {@link createRenderContext}.
 */
export interface RenderContextOptions {
  /**
   * The shader cache materials get their shaders from (default: a new
   * `createShaderCache()`, holding the engine's shaders and includes).
   */
  shaderCache?: ShaderCache;

  /** The cache images are loaded through (default: a new `ImageCache`). */
  imageCache?: ImageCache;

  /**
   * Whether `clear` clears the bound destination (default:
   * `CLEAR_STRATEGY.blank`). See `RenderContext.clearStrategy`.
   */
  clearStrategy?: CLEAR_STRATEGY_KEYS;

  /**
   * Whether the canvas keeps its drawing buffer after a frame is presented
   * (default: `false`), which reading the canvas's pixels back (e.g.
   * `toDataURL`) after the frame needs.
   */
  preserveDrawingBuffer?: boolean;

  /**
   * The highest pixel ratio to render at, however dense the display is
   * (default: no limit). See `RenderContext.maxPixelRatio`.
   */
  maxPixelRatio?: number;
}

/**
 * Creates a render context that draws into `canvas` with WebGL2.
 * `createGame` creates one for its game.
 * @param canvas - The canvas to draw into.
 * @param options - Options for the render context.
 * @returns The render context.
 * @throws An error if the canvas has no WebGL2 context, or if
 * `maxPixelRatio` isn't a positive number.
 */
export function createRenderContext(
  canvas: HTMLCanvasElement,
  options: RenderContextOptions = {},
): RenderContext {
  const {
    shaderCache,
    imageCache,
    clearStrategy,
    preserveDrawingBuffer,
    maxPixelRatio,
  } = options;

  return new RenderContext(
    shaderCache ?? createShaderCache(),
    imageCache ?? new ImageCache(),
    canvas,
    clearStrategy,
    preserveDrawingBuffer,
    maxPixelRatio,
  );
}
