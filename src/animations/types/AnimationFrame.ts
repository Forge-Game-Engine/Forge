import { Vector2 } from '../../math';

/**
 * Interface representing a single frame of an animation.
 */
export interface AnimationFrame {
  /**
   * The offset of the frame in the sprite sheet, scaled from 0 to 1.
   * This is a percentage of the total sprite sheet dimensions.
   */
  offset: Vector2;
  /**
   * The scale of the frame, which determines how it is rendered, scaled from 0 to 1.
   * This is a percentage of the total sprite sheet dimensions.
   */
  scale: Vector2;
  /**
   * The duration of the frame in seconds.
   */
  durationSeconds: number;
  /**
   * The index of the frame in the animation sequence.
   */
  frameIndex: number;
}
