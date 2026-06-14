import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for sprite animations.
 */
export interface SpriteAnimationEcsComponent {
  /**
   * The index of the currently displayed frame within the active animation clip.
   */
  animationFrameIndex: number;

  /**
   * Multiplier applied to `frameDurationMilliseconds`. Values greater than 1 play the animation faster and values between 0 and 1 play it slower. Must be greater than 0.
   */
  playbackSpeed: number;

  /**
   * How long each frame is displayed, in milliseconds, before `playbackSpeed` is applied. Must be greater than 0.
   */
  frameDurationMilliseconds: number;

  /**
   * The `Time.timeInSeconds` value when the displayed frame last changed. Updated automatically by `createSpriteAnimationEcsSystem`.
   */
  lastFrameChangeTimeInSeconds: number;

  /**
   * Handle for the active `AnimationClip` in the `AssetRegistry` passed to `createSpriteAnimationEcsSystem`.
   */
  animationClipHandle: number;
}

/**
 * Component key for {@link SpriteAnimationEcsComponent}.
 */
export const spriteAnimationId =
  createComponentId<SpriteAnimationEcsComponent>('sprite-animation');
