import { positionId, rotationId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  getRigidBodyMassData,
  getWorldCenterOfMass,
  RigidBodyMassData,
} from '../rigid-body-mass-data.js';

/**
 * A joint constraint's view of one of its two connected entities: its
 * current world rotation and center of mass plus the (inverse)
 * mass/inertia the solver needs. An entity with no
 * `RigidBodyEcsComponent`, or one whose `RigidBodyEcsComponent.type` is
 * `'static'`/`'kinematic'`, is treated as having infinite mass and turning
 * about its origin, matching contact resolution's convention (see
 * {@link getRigidBodyMassData}).
 */
export interface JointBody extends Readonly<RigidBodyMassData> {
  /**
   * The body's world center of mass, which joint lever arms are measured
   * from.
   */
  readonly centerOfMass: Vector2;
  readonly rotation: number;
}

/**
 * Resolves `entity`'s current rotation, center of mass, and mass/inertia
 * for a joint solve. Returns `null` if `entity` no longer has a position or
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

  const massData = getRigidBodyMassData(world, entity);

  return {
    ...massData,
    centerOfMass: getWorldCenterOfMass(
      position.world,
      rotation.world,
      massData.localCenterOfMass,
    ),
    rotation: rotation.world,
  };
}

/**
 * Finds the lever arm, from `body`'s world center of mass, of an anchor
 * given relative to the body's entity origin (as joint, spring and damper
 * anchors are): `rotate(localAnchor - localCenterOfMass, rotation)`. The
 * anchor's world position is `body.centerOfMass` plus the result.
 * @param body - The resolved joint body.
 * @param localAnchor - The anchor, in the entity's local space.
 * @returns The lever arm, freshly allocated.
 */
export function getJointLeverArm(
  body: JointBody,
  localAnchor: Vector2,
): Vector2 {
  // Clone before subtracting: `localAnchor` is a persistent component
  // field reused every tick.
  return Vec2.rotate(
    Vec2.subtract(Vec2.clone(localAnchor), body.localCenterOfMass),
    body.rotation,
  );
}
