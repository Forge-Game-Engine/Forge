import { Entity } from '../../ecs/index.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { AnimationFrame } from './AnimationFrame.js';

/**
 * Event type that is raised when the animation changes.
 */
export type OnAnimationChangeEvent = ParameterizedForgeEvent<Entity>;
/**
 * Event type that is raised when the animation frame changes.
 */
export type OnAnimationFrameChangeEvent = ParameterizedForgeEvent<{
  entity: Entity;
  animationFrame: AnimationFrame;
}>;

/**
 * Interface representing a group of animation frames for a specific animation name.
 */
export class AnimationClip {
  /**
   * The name of this animation.
   */
  public readonly name: string;

  /**
   * The frames of the animation.
   */
  public readonly frames: AnimationFrame[];

  /**
   * Event that is raised when the animation starts.
   */
  public readonly onAnimationStartEvent: OnAnimationChangeEvent;

  /**
   * Event that is raised when the animation ends.
   */
  public readonly onAnimationEndEvent: OnAnimationChangeEvent;

  /**
   * Event that is raised every frame change. This includes the first and last frame change of an animation
   */
  public readonly onAnimationFrameChangeEvent: OnAnimationFrameChangeEvent;

  public playbackSpeed: number;

  /**
   * Creates an instance of Animation.
   * @param name - The name of the animation.
   * @param frames - The frames of the animation.
   * @param playbackSpeed - The speed multiplier for the animation playback. Defaults to 1.
   */
  constructor(
    name: string,
    frames: AnimationFrame[],
    playbackSpeed: number = 1,
  ) {
    if (frames.length === 0) {
      throw new Error('Animation must contain at least one frame.');
    }

    this.name = name;
    this.frames = frames;
    this.playbackSpeed = playbackSpeed;

    this.onAnimationStartEvent = new ParameterizedForgeEvent<Entity>(
      'AnimationStartEvent',
    );
    this.onAnimationEndEvent = new ParameterizedForgeEvent<Entity>(
      'AnimationEndEvent',
    );
    this.onAnimationFrameChangeEvent = new ParameterizedForgeEvent<{
      entity: Entity;
      animationFrame: AnimationFrame;
    }>('AnimationFrameChangeEvent');
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
