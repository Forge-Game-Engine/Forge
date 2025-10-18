import { Vector2 } from '../../math';
import { Animation, AnimationFrame } from '../types';

/**
 * Validates the duration of animation frames.
 * @param animationFrameDurationSeconds - The duration of each animation frame in seconds.
 * This can be a single number for all frames or an array of numbers for each frame.
 * @param numFrames - The total number of frames in the animation.
 */
function validateAnimationFrameDurations(
  animationFrameDurationSeconds: number | number[],
  numFrames: number,
) {
  if (
    Array.isArray(animationFrameDurationSeconds) &&
    animationFrameDurationSeconds.length !== numFrames
  ) {
    throw new Error(
      `Animation duration array length (${animationFrameDurationSeconds.length}) must be equal to the number of frames (${numFrames}).`,
    );
  }
}

/**
 * Generates animation frames based on the provided parameters.
 * @param numFrames - The total number of frames in the animation.
 * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
 * @param startPositionPercentage - The starting position of the animation frames in the sprite sheet, as a percentage.
 * @param spriteUVSize - The size of each sprite in the sprite sheet, as a percentage.
 * @param animationFrameDurationSeconds - The duration of each animation frame in seconds.
 * @returns An array of generated animation frames.
 */
function generateAnimationFrames(
  numFrames: number,
  spritesPerRow: number,
  startPositionPercentage: Vector2,
  spriteUVSize: Vector2,
  animationFrameDurationSeconds: number | number[],
) {
  const animationFrames: AnimationFrame[] = [];

  for (let i = 0; i < numFrames; i++) {
    const row = Math.floor(i / spritesPerRow);
    const col = i % spritesPerRow;
    animationFrames.push({
      offset: new Vector2(
        startPositionPercentage.x + col * spriteUVSize.x,
        startPositionPercentage.y + row * spriteUVSize.y,
      ),
      scale: spriteUVSize,
      durationSeconds: Array.isArray(animationFrameDurationSeconds)
        ? animationFrameDurationSeconds[i]
        : animationFrameDurationSeconds,
      frameIndex: i,
    });
  }

  return animationFrames;
}

/**
 * Optional parameters for creating an animation.
 */
export interface AnimationCreationParams {
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

const defaultCreateAnimationSetParams: AnimationCreationParams = {
  startPositionPercentage: Vector2.zero,
  endPositionPercentage: Vector2.one,
};

/**
 * @param animationName - The name of the animation (e.g., 'walk', 'run').
 * @param spritesPerColumn - The number of sprites in each column of the sprite sheet.
 * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
 * @param frameDurationSeconds - The duration of each animation frame in seconds.
 * This can be a single number for all frames or an array of numbers for each frame. If an array is provided,
 * its length must match the total number of frames.
 * @param options - Optional parameters for creating the animation set.
 * @returns An Animation object containing the generated animation frames.
 */
export function createAnimation(
  animationName: string,
  spritesPerColumn: number,
  spritesPerRow: number,
  frameDurationSeconds: number | number[],
  options?: Partial<AnimationCreationParams>,
): Animation {
  const { startPositionPercentage, endPositionPercentage } = {
    ...defaultCreateAnimationSetParams,
    ...options,
  };

  const numFrames = spritesPerColumn * spritesPerRow;

  validateAnimationFrameDurations(frameDurationSeconds, numFrames);

  const spriteUVSize = new Vector2(
    (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
    (endPositionPercentage.y - startPositionPercentage.y) / spritesPerColumn,
  );

  const animationFrames = generateAnimationFrames(
    numFrames,
    spritesPerRow,
    startPositionPercentage,
    spriteUVSize,
    frameDurationSeconds,
  );

  const animation = new Animation(animationName, animationFrames);

  return animation;
}
