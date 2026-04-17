import { Vector2 } from '../../math/index.js';

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
   * The dimensions of the frame as a value between 0 to 1.
   * This is a percentage of the total sprite sheet dimensions.
   */
  dimensions: Vector2;
}
