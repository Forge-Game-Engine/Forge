import type { Component } from '../../ecs/index.js';
import { enforceArray } from '../../utilities/index.js';
import { linear } from '../easing-functions/index.js';

/**
 * Represents the properties of an animated object.
 */
export interface AnimatedProperty {
  /**
   * The starting value of the animation.
   * @default 0
   */
  startValue?: number;

  /**
   * The ending value of the animation.
   * @default 1
   */
  endValue?: number;

  /**
   * The elapsed time of the animation.
   * @default 0
   */
  elapsed?: number;

  /**
   * The duration of the animation in milliseconds.
   */
  duration: number;

  /**
   * The callback function to update the animated value.
   * @param value - The current value of the animation.
   */
  updateCallback: (value: number) => void;

  /**
   * The easing function to use for the animation.
   * @default linear
   */
  easing?: (t: number) => number;

  /**
   * The loop mode of the animation.
   * @default 'none'
   */
  loop?: LoopMode;

  /**
   * The number of times the animation should loop. -1 means that it will loop indefinitely.
   * @default -1
   */
  loopCount?: number;

  /**
   * The callback function to call when the animation is finished.
   */
  finishedCallback?: () => void;
}

const animationDefaults = {
  startValue: 0,
  endValue: 1,
  elapsed: 0,
  easing: linear,
  loop: 'none' as LoopMode,
  loopCount: -1,
  finishedCallback: () => undefined,
};

export type LoopMode = 'none' | 'loop' | 'pingpong';

/**
 * Represents an animation component that manages a collection of animations.
 */
export class AnimationComponent implements Component {
  public name: symbol;
  private readonly _animations: Required<AnimatedProperty>[];

  public static readonly symbol = Symbol('Animation');

  /**
   * Gets the list of animations managed by this component.
   * @returns An array of AnimatedProperty objects.
   */
  get animations(): Required<AnimatedProperty>[] {
    return this._animations;
  }

  /**
   * Creates an instance of AnimationComponent.
   * @param animations - An AnimatedProperty or array of AnimatedProperties to initialize the component with.
   * @example
   * const animation = new AnimationComponent({
   *     duration: 1000,
   *     updateCallback: (value) => console.log(value),
   *     easing: (t) => t * t,
   *     loop: 'loop',
   *     loopCount: 3,
   *   });
   */
  constructor(animations: AnimatedProperty[] | AnimatedProperty = []) {
    this.name = AnimationComponent.symbol;
    this._animations = [];

    for (const animation of enforceArray(animations)) {
      this.addAnimation(animation);
    }
  }

  /**
   * Adds a new animation to the component.
   * @param animation - The AnimatedProperty object to add.
   */
  public addAnimation(animation: AnimatedProperty): void {
    const mergedAnimation = { ...animationDefaults, ...animation };

    this._animations.push(mergedAnimation);
  }
}
