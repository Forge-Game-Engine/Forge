import {
  getInterpolatedLocalPosition,
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
 *
 * Register it in the default group, after the fixed steps and before the
 * frame's transform system. It follows the target's interpolated position,
 * where the frame's transform system draws the chassis between its last two
 * physics steps, so the camera moves with the chassis on screen instead of
 * shaking against it.
 * @param time - The time instance used to advance the smoothing and blend the
 * target's position.
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

      if (world.getComponent(targetEntity, positionId) === null) {
        continue;
      }

      // A new vector, so adding the offset into it leaves the chassis alone.
      const targetPosition = getInterpolatedLocalPosition(
        world,
        targetEntity,
        time,
      );
      const { positionOutput, velocityOutput } = smoothDampVector2(
        positionComponent.local,
        Vec2.add(targetPosition, offset),
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
