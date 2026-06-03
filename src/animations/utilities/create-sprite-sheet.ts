import { Vector2 } from '../../math/index.js';
import { AnimationFrame } from '../types';

export interface SpriteSheet {
  frames: AnimationFrame[][];
}

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
