import {
  createTextureRegion,
  type TextureRegion,
} from '../../rendering/texture-region.js';

/**
 * A sprite sheet sliced into a row-major grid of equally sized, untrimmed
 * frames, each a region of the sheet's texture.
 */
export interface SpriteSheet {
  /**
   * The frames of the sprite sheet, indexed as `frames[row][column]`.
   */
  frames: TextureRegion[][];
}

/**
 * Slices an image into a row-major grid of equally sized animation frames.
 * @param image - The source image (or its dimensions) to slice.
 * @param rows - The number of rows in the sprite sheet.
 * @param columns - The number of columns in the sprite sheet.
 * @returns A `SpriteSheet` containing the generated frames.
 */
export function createSpriteSheet(
  image: { width: number; height: number },
  rows: number,
  columns: number,
): SpriteSheet {
  const spriteWidth = image.width / columns;
  const spriteHeight = image.height / rows;
  const frameScale = {
    x: spriteWidth / image.width,
    y: spriteHeight / image.height,
  };

  const spriteSheet: SpriteSheet = {
    frames: [],
  };

  for (let row = 0; row < rows; row++) {
    spriteSheet.frames[row] = [];
    const offsetY = row * spriteHeight;

    for (let column = 0; column < columns; column++) {
      const offsetX = column * spriteWidth;

      spriteSheet.frames[row].push(
        createTextureRegion(
          { x: offsetX / image.width, y: offsetY / image.height },
          frameScale,
        ),
      );
    }
  }

  return spriteSheet;
}
