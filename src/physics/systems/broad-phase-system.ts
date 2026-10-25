import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { updateBroadPhase } from '../broad-phase/update-broad-phase.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { CollisionPair } from '../types/collision-pair.js';

/**
 * Creates an ECS system that finds the pairs of colliders whose
 * {@link ColliderEcsComponent.aabb}s overlap and writes them into
 * `collisionPairs`, sorted by `(entityA, entityB)` with `entityA` the lower
 * entity handle.
 *
 * The system keeps every collider in the world's broad phase (a
 * `BroadPhaseEcsComponent` that `createBroadPhase(world)` creates, and that
 * this system is the only writer of): a dynamic AABB tree of static
 * colliders and one of kinematic and dynamic colliders, plus the pairs it
 * found on earlier steps. Each step it recomputes the `aabb` of the
 * colliders whose world position, rotation, shape or component changed,
 * looks for new pairs only around the colliders whose tree box changed or
 * whose `category` or `mask` changed, and keeps a pair until the two
 * colliders' tree boxes separate. Its cost grows with the number of moving
 * colliders, not the square of all of them.
 *
 * Two static colliders (no `RigidBodyEcsComponent`, or a `'static'` one)
 * are never paired. Pairs whose categories and masks exclude each other
 * (see `collidersCanCollide`) are never listed.
 *
 * A collider entity needs a `PositionEcsComponent` and a
 * `ColliderEcsComponent` to take part; `RotationEcsComponent` is optional,
 * and an entity without one is treated as unrotated. Register it in the
 * fixed-update group after that group's `createTransformEcsSystem`, which
 * computes `PositionEcsComponent.world`/`RotationEcsComponent.world`, since
 * local values are only meaningful to the parenting system. The `aabb`s it
 * writes then describe the colliders as of the latest step, which is what
 * a raycast or another query made outside the step sees.
 * @param collisionPairs - The array the system clears and refills with the
 * current step's overlapping entity pairs. A pair keeps the same object on
 * every step it's listed.
 * @returns An ECS system that populates `collisionPairs` every step.
 * @throws An error on update if the world has no broad phase (see
 * `createBroadPhase`), or more than one.
 */
export const createBroadPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
): EcsSystem<[PositionEcsComponent, ColliderEcsComponent]> => ({
  query: [positionId, colliderId],
  update: (world, { entities, components: [positions, colliders] }) => {
    updateBroadPhase(
      findBroadPhase(world),
      world,
      entities,
      positions,
      colliders,
      collisionPairs,
    );
  },
});
