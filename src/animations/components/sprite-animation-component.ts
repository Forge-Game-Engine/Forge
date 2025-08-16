import type { Component } from '../../ecs';
/**
 * Options for configuring the sprite animation component.
 */
export interface SpriteAnimationOptions {
  /**
   * The index of the current animation frame.
   * @default 0
   */
  animationIndex: number;
  /**
   * The speed factor for the animation.
   * @default 1.0
   */
  animationSpeedFactor: number;
}

const defaultOptions: SpriteAnimationOptions = {
  animationIndex: 0,
  animationSpeedFactor: 1.0,
};

/**
 * Component that manages image-based animations for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent implements Component {
  public name: symbol;
  public animationSetName: string;
  public animationIndex: number;
  public currentFrameTimeSeconds: number;
  public nextAnimationName: string | null;
  public animationSpeedFactor: number;
  public currentAnimationName: string;
  public isChangingAnimation: boolean = false;

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param animationSetName - The name of the animation set this component belongs to.
   * @param currentAnimationName - The name of the current animation.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    animationSetName: string,
    currentAnimationName: string,
    options: Partial<SpriteAnimationOptions> = {},
  ) {
    const { animationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = SpriteAnimationComponent.symbol;
    this.animationSetName = animationSetName;
    this.currentAnimationName = currentAnimationName;
    this.animationIndex = animationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
    this.currentFrameTimeSeconds = 0;
    this.nextAnimationName = null;
  }
}
