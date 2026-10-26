import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  getInterpolatedLocalPosition,
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
 * Creates an ECS system that smoothly pans the camera towards `target`
 * every frame, using exponential smoothing so it eases towards the ball
 * rather than snapping to it or lagging at a fixed offset.
 *
 * Register it in the default group, after the fixed steps and before the
 * frame's transform system. It follows the ball's interpolated position,
 * where the frame's transform system draws the ball between its last two
 * physics steps, so the camera moves with the ball on screen. It writes the
 * camera's `local` position, which the transform system turns into the
 * `world` position the render system reads that frame.
 * @param target - The entity to follow, typically the ball.
 * @param time - The time instance used to scale the follow speed by delta
 * time and blend the ball's position.
 */
export const createCameraFollowEcsSystem = (
  target: number,
  time: Time,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (world, { components: [, cameraPositions] }) => {
    const targetPosition = getInterpolatedLocalPosition(world, target, time);

    for (const cameraPosition of cameraPositions) {
      const t = 1 - Math.exp(-followSpeed * time.deltaTimeInSeconds);

      cameraPosition.local.x += (targetPosition.x - cameraPosition.local.x) * t;
      cameraPosition.local.y += (targetPosition.y - cameraPosition.local.y) * t;
    }
  },
});
