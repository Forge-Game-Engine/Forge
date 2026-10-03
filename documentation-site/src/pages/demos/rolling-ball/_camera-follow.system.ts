import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  Time,
  positionId,
} from '@forge-game-engine/forge/common';
import {
  CameraEcsComponent,
  cameraId,
} from '@forge-game-engine/forge/rendering';

/** How quickly the camera closes the gap to the ball, per second. */
const followSpeed = 4;

/**
 * Creates an ECS system that smoothly pans the camera towards
 * `targetPosition` every tick, using exponential smoothing so it eases
 * towards the ball rather than snapping to it or lagging at a fixed offset.
 *
 * Reads the ball's `local` position (it has no parent, so that's its current
 * position whenever this runs) and writes the camera's `local` position,
 * which `createTransformEcsSystem` turns into the `world` position the render
 * system reads. Registered after the physics systems, so the camera's new
 * position is rendered from the next tick on - the smoothing already eases
 * it towards the ball over many ticks, so that tick of delay isn't visible.
 * @param targetPosition - The position component to follow, typically the ball's.
 * @param time - The time instance used to scale the follow speed by delta time.
 */
export const createCameraFollowEcsSystem = (
  targetPosition: PositionEcsComponent,
  time: Time,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (_world, { components: [, cameraPositions] }) => {
    for (const cameraPosition of cameraPositions) {
      const t = 1 - Math.exp(-followSpeed * time.deltaTimeInSeconds);

      cameraPosition.local.x +=
        (targetPosition.local.x - cameraPosition.local.x) * t;
      cameraPosition.local.y +=
        (targetPosition.local.y - cameraPosition.local.y) * t;
    }
  },
});
