import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { smoothDampVector2 } from '@forge-game-engine/forge/math';
import {
  CameraFollowEcsComponent,
  cameraFollowId,
} from './_camera-follow.component';

/**
 * Smoothly moves each matched entity's `PositionEcsComponent` towards its
 * `CameraFollowEcsComponent.target` position every tick, via
 * `smoothDampVector2`. Must run before `createRenderEcsSystem` so the render
 * pass sees this tick's updated camera position.
 * @param time - The time instance used to advance `smoothDampVector2` by
 * the tick's delta time.
 */
export const createCameraFollowEcsSystem = (
  time: Time,
): EcsSystem<[CameraFollowEcsComponent, PositionEcsComponent]> => ({
  query: [cameraFollowId, positionId],
  run: (result) => {
    const [cameraFollow, positionComponent] = result.components;
    const { target, offset, smoothTime, maxSpeed, velocity } = cameraFollow;

    const { positionOutput, velocityOutput } = smoothDampVector2(
      positionComponent.local,
      target.position.add(offset),
      velocity,
      maxSpeed,
      smoothTime,
      time.deltaTimeInSeconds,
    );

    cameraFollow.velocity = velocityOutput;

    positionComponent.local.x = positionOutput.x;
    positionComponent.local.y = positionOutput.y;
    positionComponent.world.x = positionOutput.x;
    positionComponent.world.y = positionOutput.y;
  },
});
