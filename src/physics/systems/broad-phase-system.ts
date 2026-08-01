import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { AabbEcsComponent, aabbId } from '../components/aabb-component.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { CollisionPair } from '../types/collision-pair.js';

/**
 * Creates an ECS system that recomputes each collider entity's
 * {@link AabbEcsComponent} from its world position/rotation and performs a
 * broad-phase, all-pairs AABB overlap test, writing every overlapping pair
 * into `collisionPairs`. Must run after whatever system computes
 * `PositionEcsComponent.world`/`RotationEcsComponent.world` (e.g.
 * `createTransformEcsSystem`), since local values are only meaningful to
 * the parenting system.
 * @param collisionPairs - The array the system clears and refills with the
 * current tick's overlapping entity pairs.
 * @returns An ECS system that populates `collisionPairs` every tick.
 */
export const createBroadPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
): EcsSystem<
  [
    PositionEcsComponent,
    RotationEcsComponent,
    ColliderEcsComponent,
    AabbEcsComponent,
  ]
> => ({
  query: [positionId, rotationId, colliderId, aabbId],
  update: (
    _world,
    { entities, components: [positions, rotations, colliders, aabbs] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const aabb = colliders[i].collider.computeAabb(
        positions[i].world,
        rotations[i].world,
      );

      aabbs[i].min = aabb.min;
      aabbs[i].max = aabb.max;
    }

    collisionPairs.length = 0;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (aabbsOverlap(aabbs[i], aabbs[j])) {
          collisionPairs.push({ entityA: entities[i], entityB: entities[j] });
        }
      }
    }
  },
});
