import type { Component, Entity } from '../../ecs';
import { ParameterizedForgeEvent } from '../../events';
import type { Animation, AnimationFrame, AnimationSet } from '../types';

/**
 * Options for configuring the sprite animation component.
 */
export interface SpriteAnimationOptions {
  /**
   * The speed factor for the animation set.
   */
  playbackSpeed: number;

  /**
   * The starting animation index within the animation set.
   */
  startingAnimationIndex: number;

  /**
   * Event that is raised when the animation changes.
   */
  animationChangeEvent: ParameterizedForgeEvent<[Entity, Animation]> | null;

  /**
   * Event that is raised when the animation frame changes.
   */
  onAnimationFrameChangeEvent: ParameterizedForgeEvent<
    [Entity, AnimationFrame]
  > | null;
}

const defaultOptions: SpriteAnimationOptions = {
  playbackSpeed: 1,
  startingAnimationIndex: 0,
  animationChangeEvent: null,
  onAnimationFrameChangeEvent: null,
};

/**
 * Component to store sprite animation information for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent implements Component {
  public name: symbol;

  public animationSet: AnimationSet;
  public animationIndex: number;
  public animationFrameIndex: number;
  public playbackSpeed: number;
  public lastFrameChangeTimeInSeconds: number;
  public animationChangeEvent: ParameterizedForgeEvent<
    [Entity, Animation]
  > | null;
  public animationFrameChangeEvent: ParameterizedForgeEvent<
    [Entity, AnimationFrame]
  > | null;

  public static readonly symbol = Symbol('SpriteAnimation');

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param currentAnimation - The current animation the sprite should have.
   * @param options - Optional parameters to configure the animation component.
   */
  constructor(
    animationSet: AnimationSet,
    options: Partial<SpriteAnimationOptions> = {},
  ) {
    const {
      playbackSpeed,
      startingAnimationIndex,
      animationChangeEvent,
      onAnimationFrameChangeEvent,
    } = {
      ...defaultOptions,
      ...options,
    };

    this.name = SpriteAnimationComponent.symbol;

    this.animationSet = animationSet;
    this.playbackSpeed = playbackSpeed;
    this.animationIndex = startingAnimationIndex;
    this.animationFrameIndex = 0;
    this.lastFrameChangeTimeInSeconds = 0;
    this.animationChangeEvent = animationChangeEvent;
    this.animationFrameChangeEvent = onAnimationFrameChangeEvent;
  }
}
