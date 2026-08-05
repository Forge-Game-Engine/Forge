import { positionId, rotationId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { getRigidBodyInverseMass } from '../rigid-body-inverse-mass.js';

/**
 * A joint constraint's view of one of its two connected entities: its
 * current world position/rotation plus the (inverse) mass/inertia the
 * solver needs. An entity with no `RigidBodyEcsComponent`, or one whose
 * `RigidBodyEcsComponent.type` is `'static'`/`'kinematic'`, is treated as
 * having infinite mass, matching contact resolution's convention (see
 * {@link getRigidBodyInverseMass}).
 */
export interface JointBody {
  readonly rigidBody: RigidBodyEcsComponent | null;
  readonly invMass: number;
  readonly invInertia: number;
  readonly position: Vector2;
  readonly rotation: number;
}

/**
 * Resolves `entity`'s current position, rotation, and mass/inertia for a
 * joint solve. Returns `null` if `entity` no longer has a position or
 * rotation component (e.g. it was destroyed), so callers can skip the
 * joint for this tick instead of throwing.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to resolve.
 * @returns The resolved joint body, or `null` if `entity` is missing a
 * position or rotation component.
 */
export function resolveJointBody(
  world: EcsWorld,
  entity: number,
): JointBody | null {
  const position = world.getComponent(entity, positionId);
  const rotation = world.getComponent(entity, rotationId);

  if (position === null || rotation === null) {
    return null;
  }

  const rigidBody = world.getComponent(entity, rigidBodyId);
  const { invMass, invInertia } = getRigidBodyInverseMass(rigidBody);

  return {
    rigidBody,
    invMass,
    invInertia,
    position: position.world,
    rotation: rotation.world,
  };
}
