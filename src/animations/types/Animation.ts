import { AnimationFrame } from './AnimationFrame';

/**
 * Interface representing a group of animation frames for a specific animation name.
 */
export class Animation {
  /**
   * The name of this animation.
   */
  public readonly name: string;

  /**
   * The frames of the animation.
   */
  public frames: AnimationFrame[];

  /**
   * Creates an instance of Animation.
   * @param name - The name of the animation.
   * @param frames - The frames of the animation.
   */
  constructor(name: string, frames: AnimationFrame[]) {
    if (frames.length === 0) {
      throw new Error('Animation must contain at least one frame.');
    }

    this.name = name;
    this.frames = frames;
  }

  /**
   * Gets a specific frame of the animation, looping if the index exceeds the number of frames.
   * @param frameIndex - The index of the frame to retrieve.
   * @returns The requested AnimationFrame.
   */
  public getFrame(frameIndex: number): AnimationFrame {
    if (frameIndex < 0 || frameIndex > this.frames.length - 1) {
      throw new Error('Frame index is out of bounds.');
    }

    return this.frames[frameIndex];
  }
}
