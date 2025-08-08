import type { Component } from '../../ecs';
/**
 * Options for configuring the image animation component.
 */
export interface ImageAnimationOptions {
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

const defaultOptions: ImageAnimationOptions = {
  animationIndex: 0,
  animationSpeedFactor: 1.0,
};

/**
 * Component that manages image-based animations for entities, such as from sprite sheets.
 */
export class ImageAnimationComponent implements Component {
  public name: symbol;
  public entityType: string;
  public animationIndex: number;
  public currentFrameTimeSeconds: number;
  public nextAnimationSetName: string | null;
  public animationSpeedFactor: number;
  public currentAnimationSetName: string;
  public isChangingAnimation: boolean = false;

  public static readonly symbol = Symbol('ImageAnimation');

  /**
   * Creates an instance of ImageAnimationComponent.
   * @param entityType - The type of the entity this animation component belongs to.
   * @param currentAnimationSetName - The name of the current animation.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    entityType: string,
    currentAnimationSetName: string,
    options: Partial<ImageAnimationOptions> = {},
  ) {
    const { animationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = ImageAnimationComponent.symbol;
    this.entityType = entityType;
    this.currentAnimationSetName = currentAnimationSetName;
    this.animationIndex = animationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
    this.currentFrameTimeSeconds = 0;
    this.nextAnimationSetName = null;
  }
}
