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
 * Writes `position.world` directly (rather than `position.local`, which
 * `createCameraEcsSystem`'s own pan/zoom input handling uses) since this
 * demo doesn't register `createTransformEcsSystem` to compute `world` from
 * `local` - the same convention every entity in this demo (and the other
 * physics demos) follows.
 * @param targetPosition - The position component to follow, typically the ball's.
 * @param time - The time instance used to scale the follow speed by delta time.
 */
export const createCameraFollowEcsSystem = (
  targetPosition: PositionEcsComponent,
  time: Time,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  run: (result) => {
    const [, cameraPosition] = result.components;
    const t = 1 - Math.exp(-followSpeed * time.deltaTimeInSeconds);

    cameraPosition.world.x +=
      (targetPosition.world.x - cameraPosition.world.x) * t;
    cameraPosition.world.y +=
      (targetPosition.world.y - cameraPosition.world.y) * t;
    cameraPosition.local.x = cameraPosition.world.x;
    cameraPosition.local.y = cameraPosition.world.y;
  },
});
