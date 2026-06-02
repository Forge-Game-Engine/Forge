import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for sprite animations.
 */
export interface SpriteAnimationEcsComponent {
  animationFrameIndex: number;
  totalFrameCount: number;
  playbackSpeed: number;
  frameDurationMilliseconds: number;
  lastFrameChangeTimeInSeconds: number;
  animationClipHandle: number;
}

export const spriteAnimationId =
  createComponentId<SpriteAnimationEcsComponent>('sprite-animation');
