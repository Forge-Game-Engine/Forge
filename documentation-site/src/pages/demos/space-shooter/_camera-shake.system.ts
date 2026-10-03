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
  update: (_world, { components: [shakeComponents, positionComponents] }) => {
    for (let i = 0; i < shakeComponents.length; i++) {
      const shakeComponent = shakeComponents[i];
      const positionComponent = positionComponents[i];

      const { currentOffset } = shakeComponent;

      if (shakeComponent.elapsedSeconds >= shakeComponent.durationSeconds) {
        // Take back whatever offset is still applied, returning the camera
        // to the position it had before the shake started.
        positionComponent.local.x -= currentOffset.x;
        positionComponent.local.y -= currentOffset.y;
        currentOffset.x = 0;
        currentOffset.y = 0;

        continue;
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

        const nextOffsetX = random.randomFloat(-1, 1) * stepIntensity;
        const nextOffsetY = random.randomFloat(-1, 1) * stepIntensity;

        // The offset lives in the camera's `local` position, so swap the
        // previously applied offset for the new one instead of adding it on
        // top, which would make the camera drift away over the shake.
        positionComponent.local.x += nextOffsetX - currentOffset.x;
        positionComponent.local.y += nextOffsetY - currentOffset.y;
        currentOffset.x = nextOffsetX;
        currentOffset.y = nextOffsetY;

        shakeComponent.nextOffsetChangeSeconds =
          shakeComponent.elapsedSeconds + offsetHoldSeconds;
      }
    }
  },
});
