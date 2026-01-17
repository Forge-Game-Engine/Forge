import { AnimationClip, AnimationInputs } from '../types/index.js';
import { FiniteStateMachine } from '../../finite-state-machine/finite-state-machine.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

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
