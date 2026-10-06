import { positionId, rotationId } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { formatEntity } from '../ecs/entity.js';
import { Vec2, Vector2 } from '../math/index.js';
import { getColliderRotation } from './collider-rotation.js';
import { applyPointImpulse } from './joints/apply-point-impulse.js';
import {
  getRigidBodyMassData,
  getWorldCenterOfMass,
} from './rigid-body-mass-data.js';

/**
 * Applies `impulse` at the world-space `point` to `entity`'s rigid body,
 * changing its velocity and, unless `point` is the body's center of mass,
 * its angular velocity. A no-op unless the entity's
 * `RigidBodyEcsComponent.type` (see {@link RigidBodyType}) is `'dynamic'`,
 * since `'static'`/`'kinematic'` bodies aren't affected by impulses.
 *
 * The body's center of mass (its collider's centroid, see
 * `getRigidBodyMassData`) is found from the entity's current world
 * transform, so to push a body without spinning it, apply the impulse at
 * its center of mass rather than at its position.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity whose rigid body to apply the impulse to.
 * @param impulse - The impulse to apply.
 * @param point - The world-space point `impulse` is applied at.
 * @throws An error if `entity` has a `'dynamic'` rigid body but no
 * `PositionEcsComponent`, or no `ColliderEcsComponent` to take its mass
 * from.
 */
export function applyImpulse(
  world: EcsWorld,
  entity: number,
  impulse: Vector2,
  point: Vector2,
): void {
  const massData = getRigidBodyMassData(world, entity);

  if (massData.invMass === 0 && massData.invInertia === 0) {
    return;
  }

  const position = world.getComponent(entity, positionId);

  if (position === null) {
    throw new Error(
      `Unable to apply an impulse to entity ${formatEntity(entity)}, it has no PositionEcsComponent.`,
    );
  }

  const centerOfMass = getWorldCenterOfMass(
    position.world,
    getColliderRotation(world.getComponent(entity, rotationId)),
    massData.localCenterOfMass,
  );

  // Clone before subtracting: `point` is the caller's own vector.
  applyPointImpulse(
    massData.rigidBody,
    Vec2.subtract(Vec2.clone(point), centerOfMass),
    massData.invMass,
    massData.invInertia,
    impulse,
  );
}
