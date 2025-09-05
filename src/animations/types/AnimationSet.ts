import { Animation } from './Animation';

/**
 * Interface representing a group of animations.
 */
export class AnimationSet {
  /**
   * The name of this animation set.
   */
  public readonly name: string;

  /**
   * The animations in this set.
   */
  public readonly animations: Animation[];

  /**
   * Creates an instance of AnimationSet.
   * @param name - The name of the animation set.
   * @param animations - The animations in this set.
   */
  constructor(name: string, animations: Animation[]) {
    if (animations.length === 0) {
      throw new Error('AnimationSet must contain at least one animation.');
    }

    this.name = name;
    this.animations = animations;
  }

  /**
   * Gets the index of the next animation.
   * @param currentAnimationIndex - The index of the current animation.
   * @returns The index of the next animation.
   */
  public getNextAnimationIndex(currentAnimationIndex: number): number {
    return (currentAnimationIndex + 1) % this.animations.length;
  }

  /**
   * Gets the index of the previous animation.
   * @param currentAnimationIndex - The index of the current animation.
   * @returns The index of the previous animation.
   */
  public getPreviousAnimationIndex(currentAnimationIndex: number): number {
    return (
      (currentAnimationIndex - 1 + this.animations.length) %
      this.animations.length
    );
  }

  /**
   * gets the next animation given the current animation index.
   * @param currentAnimationIndex - The index of the current animation.
   * @returns The next animation.
   */
  public getNextAnimation(currentAnimationIndex: number): Animation {
    const index = this.getNextAnimationIndex(currentAnimationIndex);

    return this.animations[index];
  }

  /**
   * gets the previous animation given the current animation index.
   * @param currentAnimationIndex - The index of the current animation.
   * @returns The previous animation.
   */
  public getPreviousAnimation(currentAnimationIndex: number): Animation {
    const index = this.getPreviousAnimationIndex(currentAnimationIndex);

    return this.animations[index];
  }

  /**
   * Gets an animation by its index.
   * @param animationIndex - The index of the animation to retrieve.
   * @returns The animation at the specified index.
   */
  public getAnimation(animationIndex: number): Animation {
    if (animationIndex < 0 || animationIndex > this.animations.length - 1) {
      throw new Error('Animation index out of bounds.');
    }

    return this.animations[animationIndex];
  }
}
