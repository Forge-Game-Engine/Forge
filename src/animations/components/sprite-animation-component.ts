import type { Component } from 'forge/ecs';
import { Animation } from 'forge/animations/types';
import { AnimationController } from 'forge/animations/types/AnimationController';
import { AnimationInputs } from 'forge/animations/types/AnimationInputs';

/**
 * Component to store sprite animation information for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent implements Component {
  public name: symbol;

  /**
   * The current frame index of the animation being played.
   */
  public animationFrameIndex: number;
  /**
   * The current animation being played.
   */
  public currentAnimation: Animation;
  /**
   * The speed multiplier for the animation playback. Larger values result in faster playback.
   * @default 1
   */
  public playbackSpeed: number;
  /**
   * The last time (in seconds) the animation frame was changed.
   */
  public lastFrameChangeTimeInSeconds: number;
  /**
   * The inputs used to determine the current animation from animation transitions.
   */
  public animationInputs: AnimationInputs;
  /**
   * The animation controller responsible for managing the animations.
   */
  public animationController: AnimationController;

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param animationController - The AnimationController managing the animations.
   * @param animationInputs - The inputs used to determine the current animation.
   * @param playbackSpeed - The speed multiplier for the animation playback.
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
