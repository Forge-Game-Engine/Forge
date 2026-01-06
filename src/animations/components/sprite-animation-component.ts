import { Component } from '../../ecs/index.js';
import { AnimationClip, AnimationInputs } from '../types/index.js';
import { FiniteStateMachine } from '../../finite-state-machine/finite-state-machine.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * Component to store sprite animation information for entities, such as from sprite sheets.
 */
export class SpriteAnimationComponent extends Component {
  /**
   * The current frame index of the animation being played.
   */
  public animationFrameIndex: number;

  /**
   * The speed multiplier for the animation playback. Larger values result in faster playback.
   */
  public playbackSpeed: number;

  /**
   * The duration (in milliseconds) of each frame in the animation.
   */
  public frameDurationMilliseconds: number;

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
  public stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip>;

  /**
   * Creates an instance of SpriteAnimationComponent.
   * @param stateMachine - The FiniteStateMachine managing the animations.
   * @param startingInputs - The inputs used to determine the current animation.
   * @param frameDurationMilliseconds - The duration (in milliseconds) of each frame in the animation. Defaults to 33.3333 ms (30 fps).
   * @param playbackSpeed - The speed multiplier for the animation playback. Defaults to 1.
   */
  constructor(
    stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip>,
    startingInputs: AnimationInputs,
    frameDurationMilliseconds: number = 33.3333, // 30 fps
    playbackSpeed: number = 1,
  ) {
    super();

    this.animationFrameIndex = 0;
    this.lastFrameChangeTimeInSeconds = 0;
    this.playbackSpeed = playbackSpeed;
    this.frameDurationMilliseconds = frameDurationMilliseconds;
    this.animationInputs = startingInputs;
    this.stateMachine = stateMachine;

    stateMachine.update(startingInputs);
  }
}

/**
 * ECS-style component interface for sprite animations.
 */
export interface SpriteAnimationEcsComponent {
  animationFrameIndex: number;
  playbackSpeed: number;
  frameDurationMilliseconds: number;
  lastFrameChangeTimeInSeconds: number;
  animationInputs: AnimationInputs;
  stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip>;
}

export const spriteAnimationId =
  createComponentId<SpriteAnimationEcsComponent>('sprite-animation');
