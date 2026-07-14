import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from './enums/index.js';
import { createRenderTarget, RenderTarget } from './render-target.js';

/**
 * A pair of render targets that can be flipped between a "read" and a
 * "write" target, for passes that repeatedly sample the previous pass's
 * output while writing into a separate buffer (e.g. multi-step
 * post-processing effects).
 */
export class PingPongTarget {
  private readonly _targets: [RenderTarget, RenderTarget];
  private _readIndex: 0 | 1 = 0;

  /**
   * Creates a new PingPongTarget, allocating two render targets of the given size.
   * @param gl - The WebGL2 rendering context.
   * @param width - The render target width in pixels.
   * @param height - The render target height in pixels.
   * @param format - The requested color storage format for both underlying
   * render targets. Defaults to `RENDER_TARGET_FORMAT.ldr`.
   */
  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
  ) {
    this._targets = [
      createRenderTarget(gl, width, height, format),
      createRenderTarget(gl, width, height, format),
    ];
  }

  /**
   * The render target that should be sampled from by the current pass.
   */
  get read(): RenderTarget {
    return this._targets[this._readIndex];
  }

  /**
   * The render target that the current pass should write into.
   */
  get write(): RenderTarget {
    return this._targets[this._readIndex === 0 ? 1 : 0];
  }

  /**
   * Flips the read and write targets, so the target just written to becomes
   * the target the next pass reads from.
   */
  public swap(): void {
    this._readIndex = this._readIndex === 0 ? 1 : 0;
  }

  /**
   * Resizes both render targets.
   * @param gl - The WebGL2 rendering context.
   * @param width - The new render target width in pixels.
   * @param height - The new render target height in pixels.
   */
  public resize(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
  ): void {
    this._targets[0].resize(gl, width, height);
    this._targets[1].resize(gl, width, height);
  }

  /**
   * Deletes both render targets, freeing their GPU resources.
   * @param gl - The WebGL2 rendering context.
   */
  public dispose(gl: WebGL2RenderingContext): void {
    this._targets[0].dispose(gl);
    this._targets[1].dispose(gl);
  }
}
