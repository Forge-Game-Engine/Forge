import type { Component } from '../../ecs';
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
  public animationSetName: string;
  public animationIndex: number;
  public frameTimeSeconds: number;
  public nextAnimationName: string | null;
  public animationSpeedFactor: number;
  public animationName: string;
  public isChangingAnimation: boolean = false;

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param animationSetName - The name of the animation set this component belongs to.
   * @param animationName - The name of the current animation.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    animationSetName: string,
    animationName: string,
    options: Partial<SpriteAnimationOptions> = {},
  ) {
    const { startingAnimationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = SpriteAnimationComponent.symbol;
    this.animationSetName = animationSetName;
    this.animationName = animationName;
    this.animationIndex = startingAnimationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
    this.frameTimeSeconds = 0;
    this.nextAnimationName = null;
  }
}
