import type { Texture } from '../texture.js';

/**
 * Fields of {@link ImportedTexture} with a sensible default; callers may
 * omit these.
 */
export interface ImportTextureOptions {
  /**
   * How many pixels of the texture span one world unit. The resulting
   * `worldWidth`/`worldHeight` are `width / pixelsPerUnit` and
   * `height / pixelsPerUnit`. This is independent of
   * `CameraView.pixelsPerUnit`, which converts world units to *screen*
   * pixels at render time based on the camera; `pixelsPerUnit` here
   * converts *texture* pixels to world units once, at import time.
   * Defaults to `100`.
   */
  pixelsPerUnit: number;

  /**
   * The texture's pixel width to import. Defaults to `texture.width`;
   * override for a texture whose usable pixel width differs from the
   * whole texture, for example a single frame trimmed out of a larger
   * sprite sheet.
   */
  width: number;

  /**
   * The texture's pixel height to import. Defaults to `texture.height`.
   */
  height: number;
}

/**
 * The result of running a texture through `importTexture`.
 */
export interface ImportedTexture extends ImportTextureOptions {
  /**
   * The texture that was imported.
   */
  texture: Texture;

  /**
   * The texture's width in world units: `width / pixelsPerUnit`.
   */
  worldWidth: number;

  /**
   * The texture's height in world units: `height / pixelsPerUnit`.
   */
  worldHeight: number;
}

const defaultImportTextureOptions = { pixelsPerUnit: 100 };

/**
 * Runs a texture through Forge's texture import pipeline, converting its
 * pixel dimensions into a world-unit size via `pixelsPerUnit`, the way an
 * art pipeline's per-texture import settings would. Hand the result's
 * `worldWidth`/`worldHeight` to `createSprite`/`addSpriteComponent` instead
 * of authoring a sprite's world size by hand from pixel dimensions.
 * @param texture - The texture to import.
 * @param options - Options for configuring the import. `width`/`height`
 * default to the texture's own size in texels; `pixelsPerUnit` defaults to
 * `100`.
 * @returns The resulting imported texture.
 * @throws An error if `pixelsPerUnit`, `width`, or `height` is not positive.
 */
export function importTexture(
  texture: Texture,
  options: Partial<ImportTextureOptions> = {},
): ImportedTexture {
  const pixelsPerUnit =
    options.pixelsPerUnit ?? defaultImportTextureOptions.pixelsPerUnit;
  const width = options.width ?? texture.width;
  const height = options.height ?? texture.height;

  if (pixelsPerUnit <= 0) {
    throw new Error(
      `importTexture requires a positive pixelsPerUnit, received ${pixelsPerUnit}.`,
    );
  }

  if (width <= 0 || height <= 0) {
    throw new Error(
      `importTexture requires a positive width and height, received width=${width}, height=${height}.`,
    );
  }

  return {
    texture,
    pixelsPerUnit,
    width,
    height,
    worldWidth: width / pixelsPerUnit,
    worldHeight: height / pixelsPerUnit,
  };
}
