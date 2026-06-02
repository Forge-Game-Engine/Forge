import { ForgeEvent, ParameterizedForgeEvent } from '../../events/index.js';
import { AnimationFrame } from './AnimationFrame.js';

/**
 * Event type that is raised when the animation frame changes.
 */
export type OnAnimationFrameChangeEvent =
  ParameterizedForgeEvent<AnimationFrame>;

/**
 * Interface representing a group of animation frames for a specific animation name.
 */
export class AnimationClip {
  /**
   * The frames of the animation.
   */
  public readonly frames: AnimationFrame[];

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
   */
  constructor(frames: AnimationFrame[]) {
    if (frames.length === 0) {
      throw new Error('Animation must contain at least one frame.');
    }

    this.frames = frames;

    this.onAnimationStartEvent = new ForgeEvent('AnimationStartEvent');
    this.onAnimationEndEvent = new ForgeEvent('AnimationEndEvent');
    this.onAnimationFrameChangeEvent =
      new ParameterizedForgeEvent<AnimationFrame>('AnimationFrameChangeEvent');
  }

  /**
   * Gets a specific frame of the animation, looping if the index exceeds the number of frames.
   * @param index - The index of the frame to retrieve.
   * @returns The requested AnimationFrame.
   */
  public getFrame(index: number): AnimationFrame {
    if (index < 0 || index >= this.frames.length) {
      throw new Error('Frame index is out of bounds.');
    }

    return this.frames[index];
  }
}
