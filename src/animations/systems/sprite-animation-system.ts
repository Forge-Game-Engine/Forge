import { Time } from '../../common/index.js';
import {
  type SpriteAnimationEcsComponent,
  spriteAnimationId,
} from '../components/index.js';
import { EcsSystem } from '../../ecs/index.js';
import { AnimationClip } from '../types/index.js';
import { AssetRegistry } from '../../asset-loading/asset-registry.js';
import { SpriteEcsComponent, spriteId } from '../../rendering/index.js';

/**
 * Creates a new ECS-style sprite animation system. For each entity with a
 * `SpriteAnimationEcsComponent` and a sprite, once
 * `frameDurationMilliseconds / playbackSpeed` has passed since the last frame
 * change (by `time.timeInSeconds`), it assigns the clip's `texture` to the
 * sprite's `texture` and the frame at `animationFrameIndex` to its
 * `region`, and moves `animationFrameIndex` to the next frame, back to `0`
 * after the clip's last frame. Both are written together, so the sprite
 * never draws one clip's region on another texture, and a sprite given a
 * clip of another atlas draws that atlas from the clip's first frame. The
 * sprite's `width`, `height`, `pivot` and `emissive` are left alone.
 * @param time - The Time instance.
 * @param animationRegistry - The registry containing animation clips.
 * @returns An ECS system that updates sprite animations.
 * @throws An error during an update if a component's scaled frame duration
 * isn't greater than `0`, or if its `animationFrameIndex` is out of bounds
 * for its clip.
 */
export const createSpriteAnimationEcsSystem = (
  time: Time,
  animationRegistry: AssetRegistry<AnimationClip>,
): EcsSystem<[SpriteAnimationEcsComponent, SpriteEcsComponent]> => ({
  query: [spriteAnimationId, spriteId],
  update: (
    _world,
    { components: [spriteAnimationComponents, spriteComponents] },
  ) => {
    for (let i = 0; i < spriteAnimationComponents.length; i++) {
      const spriteAnimationComponent = spriteAnimationComponents[i];
      const spriteComponent = spriteComponents[i];

      const secondsElapsedSinceLastFrameChange =
        time.timeInSeconds -
        spriteAnimationComponent.lastFrameChangeTimeInSeconds;

      const scaledFrameDurationInSeconds =
        spriteAnimationComponent.frameDurationMilliseconds /
        1000 /
        spriteAnimationComponent.playbackSpeed;

      if (scaledFrameDurationInSeconds <= 0) {
        throw new Error(
          `Invalid frame duration: ${spriteAnimationComponent.frameDurationMilliseconds} ms. Frame duration must be greater than 0.`,
        );
      }

      const frameHasFinished =
        secondsElapsedSinceLastFrameChange >= scaledFrameDurationInSeconds;

      if (!frameHasFinished) {
        continue;
      }

      const animationClip = animationRegistry.getDirect(
        spriteAnimationComponent.animationClipHandle,
      );

      const animationFrame = animationClip.getFrame(
        spriteAnimationComponent.animationFrameIndex,
      );

      if (
        spriteAnimationComponent.animationFrameIndex >=
        animationClip.frameCount - 1
      ) {
        spriteAnimationComponent.animationFrameIndex = 0;
      } else {
        spriteAnimationComponent.animationFrameIndex++;
      }

      spriteComponent.texture = animationClip.texture;
      spriteComponent.region = animationFrame;

      spriteAnimationComponent.lastFrameChangeTimeInSeconds =
        time.timeInSeconds;
    }
  },
});
