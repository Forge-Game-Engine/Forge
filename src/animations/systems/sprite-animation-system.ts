import { Entity, System } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { SpriteAnimationComponent } from '../components/index.js';
import { clamp } from '../../math/clamp.js';

/**
 * System that manages and updates sprite animations for entities, such as from sprite sheets.
 */
export class SpriteAnimationSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of SpriteAnimationSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('spriteAnimation', [SpriteAnimationComponent.symbol]);

    this._time = time;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );

    const {
      lastFrameChangeTimeInSeconds,
      frameDurationMilliseconds,
      stateMachine,
      animationInputs,
    } = spriteAnimationComponent;

    const { currentState: currentAnimationClip } = stateMachine;

    const secondsElapsedSinceLastFrameChange =
      this._time.timeInSeconds - lastFrameChangeTimeInSeconds;

    const scaledFrameDurationInSeconds =
      (frameDurationMilliseconds *
        (1 / currentAnimationClip.playbackSpeed) *
        (1 / spriteAnimationComponent.playbackSpeed)) /
      1000;

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

    spriteAnimationComponent.lastFrameChangeTimeInSeconds =
      this._time.timeInSeconds;
  }
}
