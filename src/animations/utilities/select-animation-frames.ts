import { AnimationFrame } from '../types/index.js';
import { SpriteSheet } from './create-sprite-sheet.js';

/**
 * @param spriteSheet - An array of AnimationFrame objects representing the frames in the sprite sheet.
 * @param numberOfFrames - The total number of frames to include in the animation. This should not exceed the total frames available in the sprite sheet.
 * @param startFrame - The index of the first frame to include in the animation. Default is 0 (the first frame in the sprite sheet).
 * @param rowWidth - The number of frames to select in a row before moving to the next row. Default is the number of frames in the first row of the sprite sheet.
 * @returns An Animation object containing the generated animation frames.
 */
export function selectAnimationFrames(
  spriteSheet: SpriteSheet,
  numberOfFrames: number,
  startFrame: number = 0,
  rowWidth: number = spriteSheet.frames[0].length,
): AnimationFrame[] {
  const selectedFrames: AnimationFrame[] = [];

  for (let i = 0; i < numberOfFrames; i++) {
    const frameIndex = startFrame + i;
    const row = Math.floor(frameIndex / rowWidth);
    const column = frameIndex % rowWidth;

    if (row >= spriteSheet.frames.length) {
      throw new Error(
        `Requested frame index ${frameIndex} exceeds the total number of frames in the sprite sheet.`,
      );
    }

    const frame = spriteSheet.frames[row][column];

    if (frame) {
      selectedFrames.push(frame);
    }
  }

  return selectedFrames;
}
