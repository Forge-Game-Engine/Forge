import {
  getInterpolatedLocalPosition,
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  CameraFollowEcsComponent,
  cameraFollowId,
} from './_camera-follow.component';

/**
 * Creates the system that centers each following camera on its target's X,
 * stopping where the view would show past `minX` or `maxX`. A view wider
 * than the range stays centered on it.
 *
 * Register it in the default group, after the fixed steps and before the
 * frame's transform system. It reads the target's interpolated X, where the
 * frame's transform system draws the player between its last two physics
 * steps, so the camera moves with the sprite instead of shaking against it.
 * @param renderContext - The render context the cameras draw to.
 * @param time - The time whose overstep fraction blends the target's
 * position.
 * @returns The ECS system.
 */
export const createCameraFollowEcsSystem = (
  renderContext: RenderContext,
  time: Time,
): EcsSystem<[CameraFollowEcsComponent, PositionEcsComponent]> => ({
  query: [cameraFollowId, positionId],
  update: (world, { entities, components: [follows, positions] }) => {
    for (let i = 0; i < entities.length; i++) {
      const { target, minX, maxX } = follows[i];

      if (!world.getComponent(target, positionId)) {
        continue;
      }

      const targetX = getInterpolatedLocalPosition(world, target, time).x;
      const halfWidth =
        getCameraView(world, entities[i], renderContext).size.x / 2;

      positions[i].local.x =
        maxX - minX < halfWidth * 2
          ? (minX + maxX) / 2
          : clamp(targetX, minX + halfWidth, maxX - halfWidth);
    }
  },
});
