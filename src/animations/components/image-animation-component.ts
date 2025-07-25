import type { Component } from '../../ecs';

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
  public nextAnimationSetName: string | null = null;
  public animationSpeedFactor: number;

  // if set directly, the animation can break
  public currentAnimation: string;

  public static readonly symbol = Symbol('ImageAnimation');

  constructor(
    entityType: string,
    currentAnimation: string,
    options: Partial<ImageAnimationOptions> = {},
  ) {
    const { animationIndex, animationSpeedFactor } = {
      ...defaultOptions,
      ...options,
    };
    this.name = ImageAnimationComponent.symbol;
    this.entityType = entityType;
    this.currentAnimation = currentAnimation;
    this.animationIndex = animationIndex;
    this.animationSpeedFactor = animationSpeedFactor;
  }

  public setCurrentAnimation(animation: string): void {
    this.nextAnimationSetName = null;
    this.currentAnimation = animation;
    this.animationIndex = 0;
  }

  public nextAnimation(): void {
    if (this.nextAnimationSetName) {
      this.setCurrentAnimation(this.nextAnimationSetName);
    }
  }
}
