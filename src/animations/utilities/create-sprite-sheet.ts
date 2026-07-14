import { Vector2 } from '../../math/index.js';
import { AnimationFrame } from '../types/index.js';

/**
 * A sprite sheet sliced into a row-major grid of frames, where each frame's
 * `offset` and `dimensions` are expressed as a percentage (0 to 1) of the
 * sheet's total size.
 */
export interface SpriteSheet {
  /**
   * The frames of the sprite sheet, indexed as `frames[row][column]`.
   */
  frames: AnimationFrame[][];
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

  const spriteSheet: SpriteSheet = {
    frames: [],
  };

  for (let row = 0; row < rows; row++) {
    spriteSheet.frames[row] = [];
    const offsetY = row * spriteHeight;

    for (let column = 0; column < columns; column++) {
      const offsetX = column * spriteWidth;

      const frame: AnimationFrame = {
        offset: new Vector2(offsetX / image.width, offsetY / image.height),
        dimensions: new Vector2(
          spriteWidth / image.width,
          spriteHeight / image.height,
        ),
      };

      spriteSheet.frames[row].push(frame);
    }
  }

  return spriteSheet;
}
