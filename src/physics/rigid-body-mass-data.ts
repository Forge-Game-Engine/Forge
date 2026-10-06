import { EcsWorld } from '../ecs/ecs-world.js';
import { formatEntity } from '../ecs/entity.js';
import { Vec2, Vector2 } from '../math/index.js';
import { colliderId } from './components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from './components/rigidbody-component.js';

/**
 * A rigid body's mass data, as the contact and joint solvers use it.
 */
export interface RigidBodyMassData {
  /**
   * The entity's rigid body, or `null` if it has none (static geometry).
   */
  rigidBody: RigidBodyEcsComponent | null;
  invMass: number;
  invInertia: number;

  /**
   * The point, in the entity's local space, the body turns about and its
   * `velocity` is measured at: its collider's center of mass for a
   * `'dynamic'` body, and the entity's origin otherwise. Never mutate it:
   * for a dynamic body it's the collider's own data.
   */
  localCenterOfMass: Vector2;
}

/**
 * Resolves the mass data the solver should use for `entity`.
 *
 * A `'dynamic'` body takes its mass, moment of inertia and center of mass
 * from the {@link Collider} in its `ColliderEcsComponent`. Every other body
 * (`'static'`, `'kinematic'`, or an entity with no `RigidBodyEcsComponent`,
 * the static convention every collider-only entity follows) has `0` inverse
 * mass/inertia (infinite effective mass) and turns about its own origin, as
 * in Box2D. `0` inverse mass/inertia is what makes `applyPointImpulse` a
 * no-op for these bodies, so they're never moved by a collision or joint
 * impulse - but their (possibly user-set) `velocity` is still read by
 * `velocityAtPoint`, which is what lets a kinematic body still push a
 * dynamic body it contacts.
 *
 * It's resolved fresh on every read, so changing a body's `type` or
 * collider at runtime takes effect on the next tick.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to resolve.
 * @returns The resolved mass data.
 * @throws An error if `entity` has a `'dynamic'` rigid body but no
 * `ColliderEcsComponent` to take its mass from.
 */
export function getRigidBodyMassData(
  world: EcsWorld,
  entity: number,
): RigidBodyMassData {
  const rigidBody = world.getComponent(entity, rigidBodyId);

  if (rigidBody === null || rigidBody.type !== 'dynamic') {
    return {
      rigidBody,
      invMass: 0,
      invInertia: 0,
      localCenterOfMass: Vec2.zero,
    };
  }

  const collider = world.getComponent(entity, colliderId);

  if (collider === null) {
    throw new Error(
      `Dynamic rigid body entity ${formatEntity(entity)} has no ColliderEcsComponent. A dynamic body takes its mass, moment of inertia and center of mass from its collider.`,
    );
  }

  return {
    rigidBody,
    invMass: 1 / collider.collider.mass,
    invInertia: 1 / collider.collider.momentOfInertia,
    localCenterOfMass: collider.collider.localCenterOfMass,
  };
}

/**
 * Transforms a body's local center of mass into world space.
 * @param position - The entity's world position.
 * @param rotation - The entity's world rotation, in radians.
 * @param localCenterOfMass - The body's local center of mass (see
 * {@link RigidBodyMassData.localCenterOfMass}).
 * @returns The body's world center of mass, freshly allocated.
 */
export function getWorldCenterOfMass(
  position: Vector2,
  rotation: number,
  localCenterOfMass: Vector2,
): Vector2 {
  // Clone before rotating: `localCenterOfMass` is the collider's own data.
  return Vec2.add(
    Vec2.rotate(Vec2.clone(localCenterOfMass), rotation),
    position,
  );
}
