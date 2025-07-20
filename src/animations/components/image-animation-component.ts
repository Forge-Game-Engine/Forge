import type { Component } from '../../ecs';

/*
Pros: 
    Allows for multiple animations per entity type.
    Animations can have a default next animation, allowing for one off animations
    Animations can have different times per frame for customization.
    Animations can be reused by the same entity type, for efficiency
    Animations can have a next animation, letting them finish the current animation if that is desired.
    Animations are set per entity type, so that same animations can exist with different options for different entities.

Limitations: 
    All animations for an entity must be on the same sprite sheet.

TODO:
  - figure out how to allow multiple spritesheet's?
  - find a way to enforce animations to complete if needed (eg: a jump must end before the next animation can start)
    
*/

export interface ImageAnimationOptions {
  animationIndex: number;
  animationSpeedFactor: number;
}

const defaultOptions: ImageAnimationOptions = {
  animationIndex: 0,
  animationSpeedFactor: 1.0,
};
export class ImageAnimationComponent implements Component {
  public name: symbol;
  public entityType: string;
  public animationIndex: number;
  public currentFrameTimeSeconds: number = 0;
  public nextAnimationState?: string;
  public animationSpeedFactor: number;

  // if set directly, the animation can break
  private _currentAnimation: string;

  public static readonly symbol = Symbol('ImageAnimation');

  constructor(
    entityType: string,
    _currentAnimation: string,
    options: Partial<ImageAnimationOptions> = {},
  ) {
    const { animationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = ImageAnimationComponent.symbol;
    this.entityType = entityType;
    this._currentAnimation = _currentAnimation;
    this.animationIndex = animationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
  }

  public getCurrentAnimation(): string {
    return this._currentAnimation;
  }

  public setCurrentAnimation(animation: string): void {
    this.nextAnimationState = undefined;
    this._currentAnimation = animation;
    this.animationIndex = 0;
  }

  public nextAnimation(): void {
    if (this.nextAnimationState) {
      this.setCurrentAnimation(this.nextAnimationState);
      this.nextAnimationState = undefined;
    }
  }
}
