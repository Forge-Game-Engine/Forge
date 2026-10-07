import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from './enums/index.js';
import type { RenderContext } from './render-context.js';
import {
  registerCanvasSizedRenderTarget,
  unregisterCanvasSizedRenderTarget,
} from './render-target-registry.js';
import {
  createEmptyTexture,
  resolveRenderTargetFormat,
} from './shaders/index.js';

/**
 * A render target's size: a fixed `width` x `height` in pixels, or
 * `'canvas'` - the render context's drawing buffer (`RenderContext.width` x
 * `RenderContext.height`, in device pixels), followed automatically whenever
 * the render context resizes.
 */
export type RenderTargetSize = { width: number; height: number } | 'canvas';

/**
 * One color texture and the framebuffer it's attached to.
 */
interface ColorBuffer {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

/**
 * An off-screen render destination: a framebuffer with a color texture
 * attachment. Used to render a scene (or a pass over a previous render
 * target's output) into a texture instead of directly onto the canvas.
 *
 * A full-screen pass can't sample the texture it draws into, so a
 * post-processing pass over a target needs somewhere else to write. The
 * target keeps a second color buffer for that, allocated the first time
 * `swapBuffers` runs (see `beginPostProcessPass`): each pass reads the
 * current buffer and writes the other, which then becomes current. Targets
 * that are never post-processed never allocate it.
 *
 * A target is either canvas-sized or fixed-size (see `RenderTargetSize`). A
 * canvas-sized target - what a camera that covers the canvas renders into -
 * is resized by its render context whenever the canvas is, so it never
 * needs resizing by hand and `resize` throws for it. A fixed-size target
 * (a minimap, a render-to-texture with its own resolution, an effect's
 * downsampled scratch buffer) keeps its size until `resize` is called.
 */
export class RenderTarget {
  /**
   * The color texture's storage format, resolved once at construction. See
   * `RENDER_TARGET_FORMAT`.
   */
  public readonly format: RENDER_TARGET_FORMAT_KEYS;

  private readonly _renderContext: RenderContext;
  private readonly _isCanvasSized: boolean;
  private readonly _followCanvas: () => void;
  private _width: number;
  private _height: number;
  private _current: ColorBuffer;
  private _other: ColorBuffer | null;

  /**
   * Creates a new RenderTarget.
   * @param renderContext - The render context the target belongs to.
   * @param size - The target's size: `'canvas'` to follow the render
   * context's drawing buffer, or a fixed `{ width, height }` in pixels.
   * @param format - The requested color storage format. Defaults to
   * `RENDER_TARGET_FORMAT.ldr`. `RENDER_TARGET_FORMAT.hdr` falls back to
   * `ldr` if the context lacks `EXT_color_buffer_float` (see
   * `resolveRenderTargetFormat`).
   * @throws An error if a fixed size isn't positive, or if the framebuffer
   * is not complete after attaching the color texture.
   */
  constructor(
    renderContext: RenderContext,
    size: RenderTargetSize,
    format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
  ) {
    this._renderContext = renderContext;
    this._isCanvasSized = size === 'canvas';

    this._followCanvas = (): void => {
      this._reallocate(renderContext.width, renderContext.height);
    };

    const { width, height } =
      size === 'canvas'
        ? { width: renderContext.width, height: renderContext.height }
        : size;

    assertValidSize(width, height);

    this._width = width;
    this._height = height;
    this.format = resolveRenderTargetFormat(renderContext.gl, format);
    this._current = this._createColorBuffer();
    this._other = null;

    if (this._isCanvasSized) {
      registerCanvasSizedRenderTarget(renderContext, this._followCanvas);
    }
  }

  /**
   * The render target width in pixels. A canvas-sized target's width is
   * always its render context's `width`.
   */
  get width(): number {
    return this._width;
  }

  /**
   * The render target height in pixels. A canvas-sized target's height is
   * always its render context's `height`.
   */
  get height(): number {
    return this._height;
  }

  /**
   * The framebuffer of the current color buffer: the one that binding this
   * target draws into, and that `colorTexture` is attached to. Changes when
   * `swapBuffers` runs.
   */
  get framebuffer(): WebGLFramebuffer {
    return this._current.framebuffer;
  }

  /**
   * The current color texture, holding this target's latest contents for
   * later passes to read. Changes when `swapBuffers` runs (every
   * post-processing pass over this target) or the target is resized, so
   * read it when drawing rather than keeping it from an earlier frame.
   */
  get colorTexture(): WebGLTexture {
    return this._current.texture;
  }

  /**
   * Makes the other color buffer current, allocating it on first use at
   * this target's size and format, and returns the previously current color
   * texture. The new current buffer still holds whatever was last drawn into
   * it, so the caller must replace every pixel of it.
   *
   * Effects call `beginPostProcessPass` instead, which swaps, binds and
   * clears the new current buffer and turns blending off in one step;
   * swapping without doing all of that leaves stale pixels in the target.
   * @returns The color texture that was current before the swap, holding
   * this target's latest contents.
   * @throws An error if the second buffer's framebuffer is not complete.
   */
  public swapBuffers(): WebGLTexture {
    const previous = this._current;

    this._current = this._other ?? this._createColorBuffer();
    this._other = previous;

    return previous.texture;
  }

  /**
   * Resizes a fixed-size render target, recreating its color textures at
   * the new dimensions. A canvas-sized target follows its render context
   * instead, so it can't be resized directly.
   * @param width - The new render target width in pixels.
   * @param height - The new render target height in pixels.
   * @throws An error if the target is canvas-sized, if either dimension
   * isn't positive, or if the framebuffer is not complete after reattaching
   * a color texture.
   */
  public resize(width: number, height: number): void {
    if (this._isCanvasSized) {
      throw new Error(
        'A canvas-sized render target follows its render context and cannot be resized directly. Create it with a fixed { width, height } size to resize it yourself.',
      );
    }

    assertValidSize(width, height);

    this._reallocate(width, height);
  }

  /**
   * Deletes the framebuffers and color textures, freeing their GPU
   * resources, and stops a canvas-sized target following its render
   * context. The render context holds on to every canvas-sized target until
   * it's disposed, so dispose a target you stop using.
   */
  public dispose(): void {
    unregisterCanvasSizedRenderTarget(this._renderContext, this._followCanvas);
    this._disposeColorBuffer(this._current);

    if (this._other) {
      this._disposeColorBuffer(this._other);
    }
  }

  private _reallocate(width: number, height: number): void {
    this._width = width;
    this._height = height;

    this._resizeColorBuffer(this._current);

    if (this._other) {
      this._resizeColorBuffer(this._other);
    }
  }

  private _createColorBuffer(): ColorBuffer {
    const { gl } = this._renderContext;
    const buffer: ColorBuffer = {
      framebuffer: gl.createFramebuffer(),
      texture: createEmptyTexture(gl, this._width, this._height, this.format),
    };

    this._attachColorTexture(buffer);

    return buffer;
  }

  private _resizeColorBuffer(buffer: ColorBuffer): void {
    const { gl } = this._renderContext;

    gl.deleteTexture(buffer.texture);

    buffer.texture = createEmptyTexture(
      gl,
      this._width,
      this._height,
      this.format,
    );

    this._attachColorTexture(buffer);
  }

  private _disposeColorBuffer(buffer: ColorBuffer): void {
    const { gl } = this._renderContext;

    gl.deleteFramebuffer(buffer.framebuffer);
    gl.deleteTexture(buffer.texture);
  }

  private _attachColorTexture(buffer: ColorBuffer): void {
    const { gl } = this._renderContext;
    const previousFramebuffer = gl.getParameter(
      gl.FRAMEBUFFER_BINDING,
    ) as WebGLFramebuffer | null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      buffer.texture,
      0,
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Render target framebuffer is incomplete: ${status}`);
    }
  }
}

/**
 * Creates a new RenderTarget.
 * @param renderContext - The render context the target belongs to.
 * @param size - The target's size: `'canvas'` for a target that covers the
 * canvas (a camera's target, presented over the whole screen), which the
 * render context resizes along with the canvas; or a fixed
 * `{ width, height }` in pixels, which only changes when you call
 * `RenderTarget.resize`.
 * @param format - The requested color storage format. Defaults to
 * `RENDER_TARGET_FORMAT.ldr`.
 * @returns The created render target.
 */
export function createRenderTarget(
  renderContext: RenderContext,
  size: RenderTargetSize,
  format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
): RenderTarget {
  return new RenderTarget(renderContext, size, format);
}

function assertValidSize(width: number, height: number): void {
  if (
    Number.isNaN(width) ||
    Number.isNaN(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('Render target dimensions must be positive numbers.');
  }
}
