import { Time } from '../../common/index.js';
import {
  type SpriteAnimationEcsComponent,
  spriteAnimationId,
} from '../components/index.js';
import { EcsSystem } from '../../ecs/index.js';

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
      (currentAnimationClip.playbackSpeed * spriteAnimationComponent.playbackSpeed);

    if (scaledFrameDurationInSeconds <= 0) {
      // Invalid or zero frame duration — do nothing to avoid division-by-zero
      return;
    }

    const frameCount = currentAnimationClip.frames.length;
    const denominator = Math.max(1, frameCount - 1);

    const frameHasFinished =
      secondsElapsedSinceLastFrameChange >= scaledFrameDurationInSeconds;

    if (!frameHasFinished) {
      return;
    }

    animationInputs.animationClipPlaybackPercentage =
      spriteAnimationComponent.animationFrameIndex / denominator;

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
