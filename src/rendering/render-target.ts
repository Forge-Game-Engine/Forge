import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from './enums/index.js';
import { OwnedTexture } from './owned-texture.js';
import { resolveRenderTargetFormat } from './shaders/utils/resolve-render-target-format.js';
import type { Texture } from './texture.js';

/**
 * One color texture and the framebuffer it's attached to.
 */
interface ColorBuffer {
  framebuffer: WebGLFramebuffer;
  texture: OwnedTexture;
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
 */
export class RenderTarget {
  /**
   * The color texture's storage format, resolved once at construction. See
   * `RENDER_TARGET_FORMAT`.
   */
  public readonly format: RENDER_TARGET_FORMAT_KEYS;

  /**
   * The render target width in pixels.
   */
  public width: number;

  /**
   * The render target height in pixels.
   */
  public height: number;

  private _current: ColorBuffer;
  private _other: ColorBuffer | null;

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
    this.width = width;
    this.height = height;
    this.format = resolveRenderTargetFormat(gl, format);
    this._current = this._createColorBuffer(gl);
    this._other = null;
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
   * read it when drawing rather than keeping it from an earlier frame. The
   * texture belongs to the render target: sample it, but don't update or
   * dispose it.
   */
  get colorTexture(): Texture {
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
   * @param gl - The WebGL2 rendering context.
   * @returns The color texture that was current before the swap, holding
   * this target's latest contents.
   * @throws An error if the second buffer's framebuffer is not complete.
   */
  public swapBuffers(gl: WebGL2RenderingContext): Texture {
    const previous = this._current;

    this._current = this._other ?? this._createColorBuffer(gl);
    this._other = previous;

    return previous.texture;
  }

  /**
   * Resizes the render target, recreating its color textures at the new dimensions.
   * @param gl - The WebGL2 rendering context.
   * @param width - The new render target width in pixels.
   * @param height - The new render target height in pixels.
   * @throws An error if the framebuffer is not complete after reattaching a color texture.
   */
  public resize(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
  ): void {
    if (width <= 0 || height <= 0) {
      throw new Error('Render target dimensions must be positive numbers.');
    }

    this.width = width;
    this.height = height;

    this._resizeColorBuffer(gl, this._current);

    if (this._other) {
      this._resizeColorBuffer(gl, this._other);
    }
  }

  /**
   * Deletes the framebuffers and color textures, freeing their GPU resources.
   * @param gl - The WebGL2 rendering context.
   */
  public dispose(gl: WebGL2RenderingContext): void {
    this._disposeColorBuffer(gl, this._current);

    if (this._other) {
      this._disposeColorBuffer(gl, this._other);
    }
  }

  private _createColorBuffer(gl: WebGL2RenderingContext): ColorBuffer {
    const buffer: ColorBuffer = {
      framebuffer: gl.createFramebuffer(),
      texture: OwnedTexture.createRenderTargetColor(
        gl,
        this.width,
        this.height,
        this.format,
      ),
    };

    this._attachColorTexture(gl, buffer);

    return buffer;
  }

  private _resizeColorBuffer(
    gl: WebGL2RenderingContext,
    buffer: ColorBuffer,
  ): void {
    buffer.texture.release();
    buffer.texture = OwnedTexture.createRenderTargetColor(
      gl,
      this.width,
      this.height,
      this.format,
    );

    this._attachColorTexture(gl, buffer);
  }

  private _disposeColorBuffer(
    gl: WebGL2RenderingContext,
    buffer: ColorBuffer,
  ): void {
    gl.deleteFramebuffer(buffer.framebuffer);
    buffer.texture.release();
  }

  private _attachColorTexture(
    gl: WebGL2RenderingContext,
    buffer: ColorBuffer,
  ): void {
    const previousFramebuffer = gl.getParameter(
      gl.FRAMEBUFFER_BINDING,
    ) as WebGLFramebuffer | null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      buffer.texture.glTexture,
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
