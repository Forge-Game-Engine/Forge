import { ForgeEvent, ParameterizedForgeEvent } from '../../events/index.js';
import type { TextureRegion } from '../../rendering/texture-region.js';

/**
 * Event type that is raised when the animation frame changes.
 */
export type OnAnimationFrameChangeEvent =
  ParameterizedForgeEvent<TextureRegion>;

/**
 * A sequence of frames, each a region of a texture, that a sprite animation
 * plays in order, looping back to the first frame after the last. Frames
 * can differ in size and trim: each is drawn inside the sprite's untrimmed
 * `width`/`height`.
 */
export class AnimationClip {
  /**
   * The frames of the animation.
   */
  public readonly frames: TextureRegion[];

  /**
   * The total number of frames in the animation.
   */
  public readonly frameCount: number;

  /**
   * Event that is raised when the animation starts.
   */
  public readonly onAnimationStartEvent: ForgeEvent;

  /**
   * Event that is raised when the animation ends.
   */
  public readonly onAnimationEndEvent: ForgeEvent;

  /**
   * Event that is raised every frame change. This includes the first and last frame change of an animation
   */
  public readonly onAnimationFrameChangeEvent: OnAnimationFrameChangeEvent;

  /**
   * Creates an instance of Animation.
   * @param frames - The frames of the animation.
   * @throws An error if `frames` is empty.
   */
  constructor(frames: TextureRegion[]) {
    if (frames.length === 0) {
      throw new Error('Animation must contain at least one frame.');
    }

    this.frames = frames;
    this.frameCount = frames.length;

    this.onAnimationStartEvent = new ForgeEvent('AnimationStartEvent');
    this.onAnimationEndEvent = new ForgeEvent('AnimationEndEvent');
    this.onAnimationFrameChangeEvent =
      new ParameterizedForgeEvent<TextureRegion>('AnimationFrameChangeEvent');
  }

  /**
   * Gets a specific frame of the animation.
   * @param index - The index of the frame to retrieve.
   * @returns The requested frame.
   * @throws An error if `index` is less than `0` or not less than `frameCount`.
   */
  public getFrame(index: number): TextureRegion {
    if (index < 0 || index >= this.frames.length) {
      throw new Error('Frame index is out of bounds.');
    }

    return this.frames[index];
  }
}
