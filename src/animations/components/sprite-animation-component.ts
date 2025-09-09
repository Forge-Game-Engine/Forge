import type { Component } from '../../ecs';
import { Animation } from '../types';
import { AnimationController } from '../types/AnimationController';
import { AnimationInputs } from '../types/AnimationInputs';

/**
 * Component to store sprite animation information for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent implements Component {
  public name: symbol;

  public animationFrameIndex: number;
  public currentAnimation: Animation;
  public playbackSpeed: number;
  public lastFrameChangeTimeInSeconds: number;
  public animationInputs: AnimationInputs;
  public animationController: AnimationController;

  // Inputs
  // Controller

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param currentAnimation - The current animation the sprite should have.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    animationController: AnimationController,
    animationInputs: AnimationInputs,
    playbackSpeed: number = 1,
  ) {
    this.name = SpriteAnimationComponent.symbol;

    this.playbackSpeed = playbackSpeed;
    this.animationFrameIndex = 0;
    this.lastFrameChangeTimeInSeconds = 0;
    this.animationInputs = animationInputs;
    this.animationController = animationController;
    this.currentAnimation =
      animationController.getEntryAnimation(animationInputs);
  }
}
