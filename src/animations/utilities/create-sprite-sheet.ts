import { Vector2 } from '../../math';
import { AnimationFrame } from '../types';

/**
 * Interface representing a sprite sheet, which is a collection of animation frames organized in a grid.
 */
export interface SpriteSheet {
  /** A 2D array of animation frames, where each sub-array represents a row of frames in the sprite sheet. */
  frames: AnimationFrame[][];
}

/**
 * Options for creating a sprite sheet, allowing for customization of borders and gaps between sprites.
 */
export interface CreateSpriteSheetOptions {
  /**
   * Optional border around all sprites, specified in pixels. This can help prevent texture bleeding when rendering sprites.
   */
  borderInPixels?: Vector2;
  /**
   * Optional gap between sprites, specified in pixels. This can also help prevent texture bleeding when rendering sprites.
   */
  gapInPixels?: Vector2;
}

/**
 * Creates an array of animation frames based on the provided sprite sheet image and layout parameters.
 * @param image - An object containing the width and height of the sprite sheet image.
 * @param spritePixelSize - The size of each individual sprite in pixels.
 * @returns A SpriteSheet
 */
export function createSpriteSheet(
  image: { width: number; height: number },
  spritePixelSize: Vector2,
  options: CreateSpriteSheetOptions = {},
): SpriteSheet {
  const border = options.borderInPixels ?? Vector2.zero;
  const gap = options.gapInPixels ?? Vector2.zero;

  // Determine how many sprites fit horizontally and vertically given the
  // nominal sprite pixel size, border (outer padding) and gap (inner spacing).
  const spritesPerRow = Math.max(
    1,
    Math.floor(
      (image.width - border.x * 2 + gap.x) / (spritePixelSize.x + gap.x),
    ),
  );
  const spritesPerColumn = Math.max(
    1,
    Math.floor(
      (image.height - border.y * 2 + gap.y) / (spritePixelSize.y + gap.y),
    ),
  );

  const totalHorizontalGaps = gap.x * Math.max(0, spritesPerRow - 1);
  const totalVerticalGaps = gap.y * Math.max(0, spritesPerColumn - 1);

  const availableWidth = image.width - border.x * 2 - totalHorizontalGaps;
  const availableHeight = image.height - border.y * 2 - totalVerticalGaps;

  const rawSpriteWidth = availableWidth / spritesPerRow;
  const rawSpriteHeight = availableHeight / spritesPerColumn;

  const spriteSheet: SpriteSheet = {
    frames: [],
  };

  for (let row = 0; row < spritesPerColumn; row++) {
    spriteSheet.frames[row] = [];

    for (let column = 0; column < spritesPerRow; column++) {
      const rawOffsetX = border.x + column * (rawSpriteWidth + gap.x);
      const rawOffsetY = border.y + row * (rawSpriteHeight + gap.y);

      const frame: AnimationFrame = {
        offset: new Vector2(
          rawOffsetX / image.width,
          rawOffsetY / image.height,
        ),
        dimensions: new Vector2(
          rawSpriteWidth / image.width,
          rawSpriteHeight / image.height,
        ),
      };

      spriteSheet.frames[row].push(frame);
    }
  }

  return spriteSheet;
}
