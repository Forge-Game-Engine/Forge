import type { Component } from '../../ecs';
import { Animation } from '../utilities';
/**
 * Options for configuring the sprite animation component.
 */
export interface SpriteAnimationOptions {
  /**
   * The index of the current animation frame.
   * @default 0
   */
  startingAnimationIndex: number;
  /**
   * The speed factor for the animation.
   * @default 1.0
   */
  animationSpeedFactor: number;
}

const defaultOptions: SpriteAnimationOptions = {
  startingAnimationIndex: 0,
  animationSpeedFactor: 1.0,
};

/**
 * Component to store sprite animation information for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent implements Component {
  public name: symbol;
  public animationIndex: number;
  public frameTimeSeconds: number;
  public nextAnimation: Animation | null;
  public animationSpeedFactor: number;
  public animation: Animation;
  public isChangingAnimation: boolean = false;

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param currentAnimation - The current animation the sprite should have.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    currentAnimation: Animation,
    options: Partial<SpriteAnimationOptions> = {},
  ) {
    const { startingAnimationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = SpriteAnimationComponent.symbol;
    this.animation = currentAnimation;
    this.animationIndex = startingAnimationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
    this.frameTimeSeconds = 0;
    this.nextAnimation = null;
  }
}
