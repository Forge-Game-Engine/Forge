import { Time } from '../../common/index.js';
import {
  type SpriteAnimationEcsComponent,
  spriteAnimationId,
} from '../components/index.js';
import { EcsSystem } from '../../new-ecs/index.js';

/**
 * Creates a new ECS-style sprite animation system.
 * @param time - The Time instance.
 * @returns An ECS system that updates sprite animations.
 */
export const createSpriteAnimationEcsSystem = (
  time: Time,
): EcsSystem<[SpriteAnimationEcsComponent]> => ({
  query: [spriteAnimationId],
  run: (result) => {
    const [spriteAnimationComponent] = result.components;

    const {
      lastFrameChangeTimeInSeconds,
      frameDurationMilliseconds,
      stateMachine,
      animationInputs,
    } = spriteAnimationComponent;

    const { currentState: currentAnimationClip } = stateMachine;

    const secondsElapsedSinceLastFrameChange =
      time.timeInSeconds - lastFrameChangeTimeInSeconds;

    const scaledFrameDurationInSeconds =
      frameDurationMilliseconds /
      1000 /
      (currentAnimationClip.playbackSpeed *
        spriteAnimationComponent.playbackSpeed);

    const frameHasFinished =
      secondsElapsedSinceLastFrameChange >= scaledFrameDurationInSeconds;

    if (!frameHasFinished) {
      return;
    }

    animationInputs.animationClipPlaybackPercentage =
      spriteAnimationComponent.animationFrameIndex /
      (currentAnimationClip.frames.length - 1);

    const animationChanged = stateMachine.update(animationInputs);
    animationInputs.update();

    if (
      animationChanged ||
      animationInputs.animationClipPlaybackPercentage >= 1
    ) {
      spriteAnimationComponent.animationFrameIndex = 0;
    } else {
      spriteAnimationComponent.animationFrameIndex++;
    }

    spriteAnimationComponent.lastFrameChangeTimeInSeconds = time.timeInSeconds;
  },
});
