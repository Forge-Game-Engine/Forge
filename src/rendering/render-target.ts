import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from './enums/index.js';
import {
  createEmptyTexture,
  resolveRenderTargetFormat,
} from './shaders/index.js';

/**
 * An off-screen render destination: a framebuffer with a single color
 * texture attachment. Used to render a scene (or a pass over a previous
 * render target's output) into a texture instead of directly onto the
 * canvas.
 *
 * A camera's render target must match the canvas's drawing buffer (the
 * camera's projection and the present pass both assume it does), so create
 * one with `RenderContext.createRenderTarget`, which keeps it sized to the
 * canvas. Use `createRenderTarget` only for targets with a size of their own,
 * such as a post-processing system's downsampled scratch buffers.
 */
export class RenderTarget {
  /**
   * The framebuffer this target renders into.
   */
  public readonly framebuffer: WebGLFramebuffer;

  /**
   * The color texture's storage format, resolved once at construction. See
   * `RENDER_TARGET_FORMAT`.
   */
  public readonly format: RENDER_TARGET_FORMAT_KEYS;

  /**
   * The color texture attached to the framebuffer, readable by later passes.
   */
  public colorTexture: WebGLTexture;

  private _width: number;
  private _height: number;

  /**
   * Creates a new RenderTarget.
   * @param gl - The WebGL2 rendering context.
   * @param width - The render target width in pixels.
   * @param height - The render target height in pixels.
   * @param format - The requested color storage format. Defaults to
   * `RENDER_TARGET_FORMAT.ldr`. `RENDER_TARGET_FORMAT.hdr` falls back to
   * `ldr` if the context lacks `EXT_color_buffer_float` (see
   * `resolveRenderTargetFormat`).
   * @throws An error if the framebuffer is not complete after attaching the color texture.
   */
  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
  ) {
    this._width = width;
    this._height = height;
    this.format = resolveRenderTargetFormat(gl, format);
    this.framebuffer = gl.createFramebuffer();
    this.colorTexture = createEmptyTexture(gl, width, height, this.format);

    this._attachColorTexture(gl);
  }

  /**
   * The render target width in pixels. Changed only by `resize`.
   */
  get width(): number {
    return this._width;
  }

  /**
   * The render target height in pixels. Changed only by `resize`.
   */
  get height(): number {
    return this._height;
  }

  /**
   * Resizes the render target, recreating its color texture at the new dimensions.
   *
   * Don't call this on a target created by `RenderContext.createRenderTarget`:
   * its context resizes it to the canvas whenever the canvas resizes, and
   * would undo any other size on the next resize.
   * @param gl - The WebGL2 rendering context.
   * @param width - The new render target width in pixels.
   * @param height - The new render target height in pixels.
   * @throws An error if the framebuffer is not complete after reattaching the color texture.
   */
  public resize(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
  ): void {
    if (width <= 0 || height <= 0) {
      throw new Error('Render target dimensions must be positive numbers.');
    }

    gl.deleteTexture(this.colorTexture);

    this._width = width;
    this._height = height;
    this.colorTexture = createEmptyTexture(gl, width, height, this.format);

    this._attachColorTexture(gl);
  }

  /**
   * Deletes the framebuffer and color texture, freeing their GPU resources.
   * @param gl - The WebGL2 rendering context.
   */
  public dispose(gl: WebGL2RenderingContext): void {
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteTexture(this.colorTexture);
  }

  private _attachColorTexture(gl: WebGL2RenderingContext): void {
    const previousFramebuffer = gl.getParameter(
      gl.FRAMEBUFFER_BINDING,
    ) as WebGLFramebuffer | null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.colorTexture,
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
 * Creates a new fixed-size RenderTarget, which keeps its size until its
 * owner calls `resize`. For a camera's render target, which has to follow the
 * canvas size, use `RenderContext.createRenderTarget` instead.
 * @param gl - The WebGL2 rendering context.
 * @param width - The render target width in pixels.
 * @param height - The render target height in pixels.
 * @param format - The requested color storage format. Defaults to
 * `RENDER_TARGET_FORMAT.ldr`.
 * @returns The created render target.
 */
export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
): RenderTarget {
  return new RenderTarget(gl, width, height, format);
}
