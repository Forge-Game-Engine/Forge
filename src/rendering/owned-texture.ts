import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from './enums/index.js';
import type { RenderContext } from './render-context.js';
import { Texture } from './texture.js';

/**
 * A texture that belongs to the engine object that created it (a render
 * target's color attachment, or one of the render context's white and black
 * textures) rather than to whoever samples it. It samples like any other
 * `Texture`, but its contents and lifetime are its owner's: `update` and
 * `dispose` throw, and the owner frees it with `release`.
 */
export class OwnedTexture extends Texture {
  private readonly _owner: string;

  /**
   * Creates an empty, linear-filtered, edge-clamped texture.
   * @param renderContext - The render context to create the texture in.
   * @param owner - What owns the texture, for error messages.
   */
  constructor(renderContext: RenderContext, owner: string) {
    super(renderContext);
    this._owner = owner;
  }

  /**
   * Creates the color attachment of a render target.
   * @param renderContext - The render context to create the texture in.
   * @param width - The width, in texels.
   * @param height - The height, in texels.
   * @param format - The storage format, already resolved by
   * `resolveRenderTargetFormat` (never a format the context can't render
   * into).
   * @returns The texture, with uninitialized contents (and empty again
   * after a lost context is restored, until its target is drawn into).
   */
  public static createRenderTargetColor(
    renderContext: RenderContext,
    width: number,
    height: number,
    format: RENDER_TARGET_FORMAT_KEYS,
  ): OwnedTexture {
    const { gl } = renderContext;
    const texture = new OwnedTexture(renderContext, 'its render target');
    const isHdr = format === RENDER_TARGET_FORMAT.hdr;

    texture.allocateStorage(
      width,
      height,
      isHdr ? gl.RGBA16F : gl.RGBA,
      isHdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    );

    return texture;
  }

  /**
   * Creates a 1x1 texture of one opaque color.
   * @param renderContext - The render context to create the texture in.
   * @param rgba - The texel, as four bytes.
   * @returns The texture.
   */
  public static createSolidColor(
    renderContext: RenderContext,
    rgba: readonly [number, number, number, number],
  ): OwnedTexture {
    const texture = new OwnedTexture(renderContext, 'the render context');

    texture.uploadPixels(1, 1, new Uint8Array(rgba));

    return texture;
  }

  /**
   * Always throws: an owned texture's contents are its owner's.
   * @throws An error naming the texture's owner.
   */
  public override update(): void {
    throw new Error(
      `This texture belongs to ${this._owner}, so it can't be updated.`,
    );
  }

  /**
   * Always throws: an owned texture is freed by its owner.
   * @throws An error naming the texture's owner.
   */
  public override dispose(): void {
    throw new Error(
      `This texture belongs to ${this._owner}, which disposes it.`,
    );
  }

  /** Frees the GPU texture. Called by the texture's owner. */
  public release(): void {
    this.deleteStorage();
  }
}
