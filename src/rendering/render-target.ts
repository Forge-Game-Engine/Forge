import { createEmptyTexture } from './shaders/index.js';

/**
 * An off-screen render destination: a framebuffer with a single color
 * texture attachment. Used to render a scene (or a pass over a previous
 * render target's output) into a texture instead of directly onto the
 * canvas.
 */
export class RenderTarget {
  /**
   * The framebuffer this target renders into.
   */
  public readonly framebuffer: WebGLFramebuffer;

  /**
   * The color texture attached to the framebuffer, readable by later passes.
   */
  public colorTexture: WebGLTexture;

  /**
   * The render target width in pixels.
   */
  public width: number;

  /**
   * The render target height in pixels.
   */
  public height: number;

  /**
   * Creates a new RenderTarget.
   * @param gl - The WebGL2 rendering context.
   * @param width - The render target width in pixels.
   * @param height - The render target height in pixels.
   * @throws An error if the framebuffer is not complete after attaching the color texture.
   */
  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.framebuffer = gl.createFramebuffer();
    this.colorTexture = createEmptyTexture(gl, width, height);

    this._attachColorTexture(gl);
  }

  /**
   * Resizes the render target, recreating its color texture at the new dimensions.
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

    this.width = width;
    this.height = height;
    this.colorTexture = createEmptyTexture(gl, width, height);

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
 * Creates a new RenderTarget.
 * @param gl - The WebGL2 rendering context.
 * @param width - The render target width in pixels.
 * @param height - The render target height in pixels.
 * @returns The created render target.
 */
export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): RenderTarget {
  return new RenderTarget(gl, width, height);
}
