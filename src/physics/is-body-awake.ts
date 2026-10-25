import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { Vector2 } from '../math/index.js';
import { colliderId } from './components/collider-component.js';
import { gravityId } from './components/gravity-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
  RigidBodySleepPartner,
  RigidBodySleepRecord,
} from './components/rigidbody-component.js';

/**
 * Whether a sleeping body's data, or the data of what it rests on, no
 * longer matches what it was when it fell asleep:
 * - a non-zero velocity or angular velocity (written by game code, an
 *   impulse or a solver), a `local` pose different from its sleep record (a
 *   teleport), `canSleep` set to `false`, or a wake request;
 * - a different `ColliderEcsComponent.collider` object, or a
 *   `GravityEcsComponent.amount` that changed, was added or was removed;
 * - a recorded partner (see `RigidBodySleepRecord.partners`) that was
 *   removed, lost its collider, has a different collider object, or has a
 *   different `position.world` or `rotation.world`.
 *
 * A body with no record yet, or without a position or rotation, is checked
 * on the rest.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The sleeping body's entity.
 * @param rigidBody - The sleeping body.
 * @param position - The body's position, if it has one.
 * @param rotation - The body's rotation, if it has one.
 * @returns Whether the body was disturbed since it fell asleep.
 */
export function isSleepingBodyDisturbed(
  world: EcsWorld,
  entity: number,
  rigidBody: RigidBodyEcsComponent,
  position: PositionEcsComponent | null,
  rotation: RotationEcsComponent | null,
): boolean {
  if (
    rigidBody.velocity.x !== 0 ||
    rigidBody.velocity.y !== 0 ||
    rigidBody.angularVelocity !== 0 ||
    !rigidBody.canSleep ||
    rigidBody.wakeRequested
  ) {
    return true;
  }

  const record = rigidBody.sleepRecord;

  if (record === null) {
    return false;
  }

  if (
    position !== null &&
    (position.local.x !== record.position.x ||
      position.local.y !== record.position.y)
  ) {
    return true;
  }

  if (rotation !== null && rotation.local !== record.rotation) {
    return true;
  }

  return (
    hasOwnSetupChanged(world, entity, record) ||
    record.partners.some((partner) => hasPartnerChanged(world, partner))
  );
}

/**
 * Whether the body's collider object or gravity differs from its record.
 */
function hasOwnSetupChanged(
  world: EcsWorld,
  entity: number,
  record: RigidBodySleepRecord,
): boolean {
  const collider = world.getComponent(entity, colliderId)?.collider ?? null;

  if (collider !== record.collider) {
    return true;
  }

  const gravity = world.getComponent(entity, gravityId)?.amount ?? null;

  return !areSameVectors(gravity, record.gravity);
}

/**
 * Whether a partner the body rests on or is jointed to was removed, moved,
 * turned, or given a different collider (or none) since the body fell
 * asleep. A removed entity has no components, so it differs from any
 * record.
 */
function hasPartnerChanged(
  world: EcsWorld,
  partner: RigidBodySleepPartner,
): boolean {
  const position = world.getComponent(partner.entity, positionId);

  if (position === null || !areSameVectors(position.world, partner.position)) {
    return true;
  }

  const rotation = world.getComponent(partner.entity, rotationId);

  if ((rotation?.world ?? null) !== partner.rotation) {
    return true;
  }

  const collider =
    world.getComponent(partner.entity, colliderId)?.collider ?? null;

  return collider !== partner.collider;
}

function areSameVectors(
  a: Readonly<Vector2> | null,
  b: Readonly<Vector2> | null,
): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return a.x === b.x && a.y === b.y;
}

/**
 * {@link isBodyAwake} for a body whose components the caller already has.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The body's entity.
 * @param rigidBody - The body.
 * @param position - The body's position, if it has one.
 * @param rotation - The body's rotation, if it has one.
 * @returns Whether the body takes part in this tick's simulation.
 */
export function isRigidBodyAwake(
  world: EcsWorld,
  entity: number,
  rigidBody: RigidBodyEcsComponent,
  position: PositionEcsComponent | null,
  rotation: RotationEcsComponent | null,
): boolean {
  if (rigidBody.type === 'static') {
    return false;
  }

  if (rigidBody.type === 'kinematic') {
    return (
      rigidBody.velocity.x !== 0 ||
      rigidBody.velocity.y !== 0 ||
      rigidBody.angularVelocity !== 0
    );
  }

  if (!rigidBody.isSleeping) {
    return true;
  }

  return isSleepingBodyDisturbed(world, entity, rigidBody, position, rotation);
}

/**
 * Whether `entity`'s rigid body takes part in this tick's simulation. The
 * physics systems that change velocity or pose (gravity, collision
 * resolution, the joint, spring and damper systems, the angular velocity
 * motor system, integration, continuous collision) skip a body that isn't
 * awake, and skip a contact or joint when neither of its bodies is awake.
 *
 * - A `'dynamic'` body is awake unless it's sleeping (see
 *   `createSleepEcsSystem`). A sleeping body that was disturbed since it
 *   fell asleep counts as awake already, so the answer is the same before
 *   and after the sleep system wakes it. It's disturbed by:
 *   - a non-zero `velocity` or `angularVelocity`, a `position.local` or
 *     `rotation.local` different from its `sleepRecord`, `canSleep` set to
 *     `false`, or `wakeRequested`;
 *   - a different `ColliderEcsComponent.collider` object, or a
 *     `GravityEcsComponent.amount` that changed, was added or was removed;
 *   - a static, kinematic or collider-only entity it rests on or is jointed
 *     to that was removed, lost its collider, got a different collider
 *     object, or has a different `position.world` or `rotation.world`.
 *
 *   Only the sleep system notices a joint, spring or damper added or
 *   removed, a new contact, and a motor's `targetVelocity` set to something
 *   other than `0`: those wake the body on its next run.
 * - A `'kinematic'` body is awake while its `velocity` or `angularVelocity`
 *   is non-zero.
 * - A `'static'` body and an entity with no `RigidBodyEcsComponent` (a
 *   collider-only entity) are never awake.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to check.
 * @returns Whether the entity's body is awake.
 */
export function isBodyAwake(world: EcsWorld, entity: number): boolean {
  const rigidBody = world.getComponent(entity, rigidBodyId);

  if (rigidBody === null) {
    return false;
  }

  if (rigidBody.type !== 'dynamic' || !rigidBody.isSleeping) {
    return isRigidBodyAwake(world, entity, rigidBody, null, null);
  }

  return isSleepingBodyDisturbed(
    world,
    entity,
    rigidBody,
    world.getComponent(entity, positionId),
    world.getComponent(entity, rotationId),
  );
}

/**
 * Whether a contact between two entities can't have changed since last
 * tick because it belongs to a sleeping island: neither entity is awake
 * (see {@link isBodyAwake}) and at least one of them is a sleeping
 * `'dynamic'` body. A pair of static bodies, still kinematic bodies or
 * collider-only entities doesn't count, since nothing puts those to sleep
 * and game code may move them. For the same reason a sleeping body counts
 * as awake once one it rests on moved or changed, so its contact with that
 * entity isn't asleep either.
 * @param world - The ECS world both entities belong to.
 * @param entityA - One entity of the contact.
 * @param entityB - The other entity of the contact.
 * @returns Whether the contact is asleep.
 */
export function isContactAsleep(
  world: EcsWorld,
  entityA: number,
  entityB: number,
): boolean {
  return (
    (isSleepingBody(world, entityA) || isSleepingBody(world, entityB)) &&
    !isBodyAwake(world, entityA) &&
    !isBodyAwake(world, entityB)
  );
}

function isSleepingBody(world: EcsWorld, entity: number): boolean {
  const rigidBody = world.getComponent(entity, rigidBodyId);

  return (
    rigidBody !== null && rigidBody.type === 'dynamic' && rigidBody.isSleeping
  );
}
