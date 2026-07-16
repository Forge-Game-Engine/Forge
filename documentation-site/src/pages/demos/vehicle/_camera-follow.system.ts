import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PositionEcsComponent, positionId } from '@forge-game-engine/forge/common';
import { CameraEcsComponent, cameraId } from '@forge-game-engine/forge/rendering';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Creates an ECS system that keeps a static camera centered on `target`
 * (plus a fixed `offset`), by writing directly to the camera entity's
 * `PositionEcsComponent` every tick. `isStatic: true` on the camera (set by
 * `createCamera`) only stops its own pan/zoom input handling from moving it,
 * not external writes like this one.
 * @param target - The body to keep centered in view, typically a vehicle's
 * chassis.
 * @param offset - A fixed world-space offset applied on top of `target`'s
 * position, for example to keep some headroom above a car.
 */
export const createCameraFollowEcsSystem = (
  target: RigidBody,
  offset: Vector2,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  run: (result) => {
    const [, positionComponent] = result.components;

    positionComponent.world.x = target.position.x + offset.x;
    positionComponent.world.y = target.position.y + offset.y;
  },
});
