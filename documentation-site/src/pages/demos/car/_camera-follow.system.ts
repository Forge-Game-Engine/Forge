import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { smoothDampVector2, Vec2 } from '@forge-game-engine/forge/math';
import {
  CameraFollowEcsComponent,
  cameraFollowId,
} from './_camera-follow.component';

/**
 * Moves each following camera towards its target with `smoothDampVector2`.
 * @param time - The time instance used to advance the smoothing.
 */
export const createCameraFollowEcsSystem = (
  time: Time,
): EcsSystem<[CameraFollowEcsComponent, PositionEcsComponent]> => ({
  query: [cameraFollowId, positionId],
  update: (
    world,
    { components: [cameraFollowComponents, positionComponents] },
  ) => {
    for (let i = 0; i < cameraFollowComponents.length; i++) {
      const cameraFollow = cameraFollowComponents[i];
      const positionComponent = positionComponents[i];
      const { targetEntity, offset, smoothTime, maxSpeed, velocity } =
        cameraFollow;

      const targetPosition = world.getComponent(targetEntity, positionId);

      if (targetPosition === null) {
        continue;
      }

      // clone: targetPosition.local is the followed entity's own live
      // position field, must not be mutated by adding offset into it.
      const { positionOutput, velocityOutput } = smoothDampVector2(
        positionComponent.local,
        Vec2.add(Vec2.clone(targetPosition.local), offset),
        velocity,
        maxSpeed,
        smoothTime,
        time.deltaTimeInSeconds,
      );

      cameraFollow.velocity = velocityOutput;

      positionComponent.local.x = positionOutput.x;
      positionComponent.local.y = positionOutput.y;
    }
  },
});
