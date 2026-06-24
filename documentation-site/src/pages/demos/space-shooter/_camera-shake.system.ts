import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
import {
  CameraShakeEcsComponent,
  cameraShakeId,
} from './_camera-shake.component';

// Holding each random offset for a few frames (instead of re-rolling every
// frame) makes the shake read as discrete jolts rather than high-frequency
// noise that blurs together at 60fps.
const offsetHoldSeconds = 0.08;

export const createCameraShakeEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[CameraShakeEcsComponent, PositionEcsComponent]> => ({
  query: [cameraShakeId, positionId],
  run: (result) => {
    const [shakeComponent, positionComponent] = result.components;

    if (shakeComponent.elapsedSeconds >= shakeComponent.durationSeconds) {
      positionComponent.world.x = positionComponent.local.x;
      positionComponent.world.y = positionComponent.local.y;

      return;
    }

    shakeComponent.elapsedSeconds += time.deltaTimeInSeconds;

    if (
      shakeComponent.elapsedSeconds >= shakeComponent.nextOffsetChangeSeconds
    ) {
      const remainingFraction = Math.max(
        0,
        1 - shakeComponent.elapsedSeconds / shakeComponent.durationSeconds,
      );
      const stepIntensity = shakeComponent.intensity * remainingFraction;

      shakeComponent.currentOffset.x =
        random.randomFloat(-1, 1) * stepIntensity;
      shakeComponent.currentOffset.y =
        random.randomFloat(-1, 1) * stepIntensity;

      shakeComponent.nextOffsetChangeSeconds =
        shakeComponent.elapsedSeconds + offsetHoldSeconds;
    }

    positionComponent.world.x =
      positionComponent.local.x + shakeComponent.currentOffset.x;
    positionComponent.world.y =
      positionComponent.local.y + shakeComponent.currentOffset.y;
  },
});
