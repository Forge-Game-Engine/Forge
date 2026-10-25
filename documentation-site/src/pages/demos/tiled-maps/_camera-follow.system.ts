import {
  PositionEcsComponent,
  positionId,
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
 * frame's transform system. It reads the target's `local` X: the player is
 * a root body, so that's its pose after the frame's last physics step,
 * where its `world` would still be a step behind and the camera would trail
 * the sprite.
 * @param renderContext - The render context the cameras draw to.
 * @returns The ECS system.
 */
export const createCameraFollowEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraFollowEcsComponent, PositionEcsComponent]> => ({
  query: [cameraFollowId, positionId],
  update: (world, { entities, components: [follows, positions] }) => {
    for (let i = 0; i < entities.length; i++) {
      const { target, minX, maxX } = follows[i];
      const targetPosition = world.getComponent(target, positionId);

      if (!targetPosition) {
        continue;
      }

      const halfWidth =
        getCameraView(world, entities[i], renderContext).size.x / 2;

      positions[i].local.x =
        maxX - minX < halfWidth * 2
          ? (minX + maxX) / 2
          : clamp(targetPosition.local.x, minX + halfWidth, maxX - halfWidth);
    }
  },
});
