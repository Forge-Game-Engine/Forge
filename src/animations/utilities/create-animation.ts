import { Vector2 } from '../../math/index.js';
import { AnimationClip, AnimationFrame } from '../types/index.js';

/**
 * Generates animation frames based on the provided parameters.
 * @param numberOfFrames - The total number of frames in the animation.
 * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
 * @param startPositionPercentage - The starting position of the animation frames in the sprite sheet, as a percentage.
 * @param spriteUVSize - The size of each sprite in the sprite sheet, as a percentage.
 * @returns An array of generated animation frames.
 */
function generateAnimationFrames(
  numberOfFrames: number,
  spritesPerRow: number,
  startPositionPercentage: Vector2,
  spriteUVSize: Vector2,
) {
  const animationFrames: AnimationFrame[] = [];

  for (let i = 0; i < numberOfFrames; i++) {
    const row = Math.floor(i / spritesPerRow);
    const col = i % spritesPerRow;

    animationFrames.push({
      offset: new Vector2(
        startPositionPercentage.x + col * spriteUVSize.x,
        startPositionPercentage.y + row * spriteUVSize.y,
      ),
      dimensions: spriteUVSize,
    });
  }

  return animationFrames;
}

/**
 * Optional parameters for creating an animation.
 */
export interface AnimationCreationOptions {
  /**
   * The starting position of the animation frames in the sprite sheet, as a percentage.
   * @default (0, 0).
   */
  startPositionPercentage: Vector2;
  /**
   * The ending position of the animation frames in the sprite sheet, as a percentage.
   * @default (1, 1).
   */
  endPositionPercentage: Vector2;
}

const defaultCreateAnimationSetParams: AnimationCreationOptions = {
  startPositionPercentage: Vector2.zero,
  endPositionPercentage: Vector2.one,
};

/**
 * @param animationName - The name of the animation (e.g., 'walk', 'run').
 * @param spritesPerColumn - The number of sprites in each column of the sprite sheet.
 * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
 * @param options - Optional parameters for creating the animation set.
 * @returns An Animation object containing the generated animation frames.
 */
export function createAnimation(
  animationName: string,
  spritesPerColumn: number,
  spritesPerRow: number,
  options?: Partial<AnimationCreationOptions>,
): AnimationClip {
  const { startPositionPercentage, endPositionPercentage } = {
    ...defaultCreateAnimationSetParams,
    ...options,
  };

  const numFrames = spritesPerColumn * spritesPerRow;

  const spriteUVSize = new Vector2(
    (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
    (endPositionPercentage.y - startPositionPercentage.y) / spritesPerColumn,
  );

  const animationFrames = generateAnimationFrames(
    numFrames,
    spritesPerRow,
    startPositionPercentage,
    spriteUVSize,
  );

  const animation = new AnimationClip(animationName, animationFrames);

  return animation;
}
