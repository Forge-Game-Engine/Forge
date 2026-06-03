import {
  AnimationClip,
  createSpriteSheet,
  selectAnimationFrames,
} from '../../src';
import { AssetRegistry } from '../../src/asset-loading/asset-registry';

export function createAnimations(image: HTMLImageElement): {
  idleAnimation: AnimationClip;
  walkAnimation: AnimationClip;
  idleAnimationHandle: number;
  walkAnimationHandle: number;
  animationRegistry: AssetRegistry<AnimationClip>;
} {
  const spriteSheet = createSpriteSheet(image, 2, 13);

  const idleAnimation = new AnimationClip(
    selectAnimationFrames(spriteSheet, 13),
  );

  const walkAnimation = new AnimationClip(
    selectAnimationFrames(spriteSheet, 13, 12),
  );

  const animationRegistry = new AssetRegistry<AnimationClip>();

  const idleAnimationHandle = animationRegistry.register('idle', idleAnimation);
  const walkAnimationHandle = animationRegistry.register('walk', walkAnimation);

  return {
    idleAnimation,
    walkAnimation,
    idleAnimationHandle,
    walkAnimationHandle,
    animationRegistry,
  };
}
