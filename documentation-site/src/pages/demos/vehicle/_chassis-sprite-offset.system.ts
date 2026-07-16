import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId } from '@forge-game-engine/forge/common';
import { RigidBody } from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * Creates an ECS system that nudges the chassis entity's rendered position
 * by `offset` (rotated into the chassis's current orientation), every tick
 * after `createPhysicsEcsSystem` has synced it to `chassis.position`. Used
 * to draw a chassis sprite larger than, and offset from, the physics
 * collision box it's paired with (see chassisSpriteSize and
 * chassisSpriteRenderOffset in `_create-vehicle.ts` for why), without
 * moving the collision box itself. Must be registered after
 * `createPhysicsEcsSystem` and before `createRenderEcsSystem`, or it either
 * has no position to offset yet or never reaches the render pass.
 * @param chassis - The vehicle's chassis body, whose current rotation the
 * offset is rotated into.
 * @param chassisEntity - The chassis's rendered entity id.
 * @param offset - The render-only offset to add to the chassis's synced
 * position, in the chassis's unrotated local space.
 */
export const createChassisSpriteOffsetEcsSystem = (
  chassis: RigidBody,
  chassisEntity: number,
  offset: Vector2,
): EcsSystem<[]> => ({
  query: [],
  run: () => undefined,
  beforeQuery: (world) => {
    const positionComponent = world.getComponent(chassisEntity, positionId);

    if (!positionComponent) {
      return null;
    }

    const rotatedOffset = offset.rotate(chassis.angle);

    positionComponent.world.x += rotatedOffset.x;
    positionComponent.world.y += rotatedOffset.y;

    return null;
  },
});
