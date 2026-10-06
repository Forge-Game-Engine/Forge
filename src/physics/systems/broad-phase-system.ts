import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { getColliderRotation } from '../collider-rotation.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { collidersCanCollide } from '../collision/collision-filter.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { CollisionPair } from '../types/collision-pair.js';

/**
 * Creates an ECS system that recomputes each collider's
 * {@link ColliderEcsComponent.aabb} from its entity's world
 * position/rotation and performs a broad-phase, all-pairs AABB overlap
 * test, writing every overlapping pair into `collisionPairs`. Pairs whose
 * categories and masks exclude each other (see `collidersCanCollide`) are
 * skipped before the AABB test. A collider entity needs a
 * `PositionEcsComponent` and a `ColliderEcsComponent` to take part;
 * `RotationEcsComponent` is optional, and an entity without one is treated
 * as unrotated. Must run after whatever system computes
 * `PositionEcsComponent.world`/`RotationEcsComponent.world` (e.g.
 * `createTransformEcsSystem`), since local values are only meaningful to
 * the parenting system.
 * @param collisionPairs - The array the system clears and refills with the
 * current tick's overlapping entity pairs.
 * @returns An ECS system that populates `collisionPairs` every tick.
 */
export const createBroadPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
): EcsSystem<[PositionEcsComponent, ColliderEcsComponent]> => ({
  query: [positionId, colliderId],
  update: (world, { entities, components: [positions, colliders] }) => {
    // Rotation is optional for colliders, so it can't be part of the query
    // above; resolving its storage once per tick avoids a lookup per entity.
    const getRotation =
      world.getComponentAccessor<RotationEcsComponent>(rotationId);

    for (let i = 0; i < entities.length; i++) {
      const collider = colliders[i];
      const aabb = collider.collider.computeAabb(
        positions[i].world,
        getColliderRotation(getRotation(entities[i])),
      );

      collider.aabb.min = aabb.min;
      collider.aabb.max = aabb.max;
    }

    collisionPairs.length = 0;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (
          collidersCanCollide(colliders[i], colliders[j]) &&
          aabbsOverlap(colliders[i].aabb, colliders[j].aabb)
        ) {
          collisionPairs.push({ entityA: entities[i], entityB: entities[j] });
        }
      }
    }
  },
});
