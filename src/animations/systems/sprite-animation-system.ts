import { Time } from '../../common/index.js';
import {
  type SpriteAnimationEcsComponent,
  spriteAnimationId,
} from '../components/index.js';
import { EcsSystem } from '../../ecs/index.js';
import { AnimationClip } from '../index.js';
import { AssetRegistry } from '../../asset-loading/asset-registry.js';
import { SpriteEcsComponent, spriteId } from '../../rendering/index.js';

/**
 * Creates a new ECS-style sprite animation system.
 * @param time - The Time instance.
 * @param animationRegistry - The registry containing animation clips.
 * @returns An ECS system that updates sprite animations.
 */
export const createSpriteAnimationEcsSystem = (
  time: Time,
  animationRegistry: AssetRegistry<AnimationClip>,
): EcsSystem<[SpriteAnimationEcsComponent, SpriteEcsComponent]> => ({
  query: [spriteAnimationId, spriteId],
  run: (result) => {
    const [spriteAnimationComponent, spriteComponent] = result.components;

    const secondsElapsedSinceLastFrameChange =
      time.timeInSeconds -
      spriteAnimationComponent.lastFrameChangeTimeInSeconds;

    const scaledFrameDurationInSeconds =
      spriteAnimationComponent.frameDurationMilliseconds /
      1000 /
      spriteAnimationComponent.playbackSpeed;

    if (scaledFrameDurationInSeconds <= 0) {
      // Invalid or zero frame duration — do nothing to avoid division-by-zero
      return;
    }

    const frameHasFinished =
      secondsElapsedSinceLastFrameChange >= scaledFrameDurationInSeconds;

    if (!frameHasFinished) {
      return;
    }

    if (
      spriteAnimationComponent.animationFrameIndex >=
      spriteAnimationComponent.totalFrameCount - 1
    ) {
      spriteAnimationComponent.animationFrameIndex = 0;
    } else {
      spriteAnimationComponent.animationFrameIndex++;
    }

    const animationFrame = animationRegistry
      .getDirect(spriteAnimationComponent.animationClipHandle)
      .getFrame(spriteAnimationComponent.animationFrameIndex);

    spriteComponent.uvOffset.x = animationFrame.offset.x;
    spriteComponent.uvOffset.y = animationFrame.offset.y;

    spriteAnimationComponent.lastFrameChangeTimeInSeconds = time.timeInSeconds;
  },
});
