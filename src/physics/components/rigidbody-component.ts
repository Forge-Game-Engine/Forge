import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { formatEntity } from '../../ecs/entity.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { Collider } from '../colliders/collider.js';
import { CollisionManifold } from '../types/collision-manifold.js';

/**
 * How a {@link RigidBodyEcsComponent} participates in the simulation:
 *
 * - `'dynamic'`: fully simulated. Affected by gravity, forces, and impulses;
 *   pushed apart by collisions; integrated into position every tick.
 * - `'kinematic'`: moved directly by game code (by setting `velocity`, or
 *   position itself). Not affected by gravity, forces, or collision
 *   impulses, but still integrated into position from `velocity` every tick
 *   and still pushes dynamic bodies it contacts. Use this for moving
 *   platforms and other scripted movers that dynamic bodies should react to.
 * - `'static'`: never moves and is never integrated, with infinite effective
 *   mass in the solver. Equivalent to an entity with no
 *   `RigidBodyEcsComponent` at all (the convention every collider-only
 *   entity, e.g. `TerrainCollider` ground, already follows); attaching a
 *   `RigidBodyEcsComponent` with this type is only useful when other
 *   components on the entity (e.g. a motor or joint) require one to be
 *   present.
 */
export type RigidBodyType = 'dynamic' | 'kinematic' | 'static';

/**
 * What `createSleepEcsSystem` records about an entity a sleeping body rests
 * on or is jointed to that the sleep system doesn't put to sleep with it: a
 * collider-only entity, a `'static'` or `'kinematic'` body. Nothing puts
 * those to sleep, so game code may move, reshape or remove one under a
 * sleeping body, and the body wakes when it does.
 */
export interface RigidBodySleepPartner {
  /** The partner entity. */
  readonly entity: number;
  /** The partner's `position.world` when the body fell asleep (a copy). */
  readonly position: Readonly<Vector2>;
  /**
   * The partner's `rotation.world` when the body fell asleep, or `null` if
   * it had no `RotationEcsComponent`.
   */
  readonly rotation: number | null;
  /**
   * The partner's `ColliderEcsComponent.collider` when the body fell
   * asleep, or `null` if it had no collider (a joint's static pivot).
   */
  readonly collider: Collider | null;
}

/**
 * What `createSleepEcsSystem` records about a body when it puts it to
 * sleep. While the body sleeps, any difference between the world's current
 * data and this record means something disturbed it, and the system wakes
 * the body's island.
 */
export interface RigidBodySleepRecord {
  /** `position.local` when the body fell asleep (a copy). */
  readonly position: Readonly<Vector2>;
  /** `rotation.local` when the body fell asleep. */
  readonly rotation: number;
  /**
   * The body's `ColliderEcsComponent.collider` when it fell asleep, or
   * `null` if it had none. A different collider object means the body's
   * shape, and so its mass and contacts, changed.
   */
  readonly collider: Collider | null;
  /**
   * The body's `GravityEcsComponent.amount` when it fell asleep (a copy), or
   * `null` if it had no gravity.
   */
  readonly gravity: Readonly<Vector2> | null;
  /**
   * The entities outside the body's island it was linked to when it fell
   * asleep, each listed once: the other entity of each collision manifold,
   * and the other body of each joint, spring or damper, when that entity
   * isn't a `'dynamic'` body the sleep system simulates.
   */
  readonly partners: readonly RigidBodySleepPartner[];
  /**
   * The body's links when it fell asleep, sorted and without duplicates:
   * the other entity of each collision manifold it was part of, and the
   * joint entity of each joint, spring or damper connecting it to another
   * entity.
   */
  readonly links: readonly number[];
  /**
   * The collision manifolds the body was part of when it fell asleep. The
   * body hasn't moved since, so while it sleeps
   * `createNarrowPhaseEcsSystem` reuses them for its pairs with entities
   * that aren't awake instead of testing those pairs again.
   */
  readonly manifolds: readonly CollisionManifold[];
}

/**
 * ECS-style component interface for a rigid body.
 *
 * A body's mass, moment of inertia and center of mass aren't stored here: a
 * `'dynamic'` body takes them from the `Collider` in its entity's
 * `ColliderEcsComponent` (see `getRigidBodyMassData`), which computes them from
 * the shape and its density.
 */
export interface RigidBodyEcsComponent {
  /**
   * The world-space velocity of the body's center of mass. For a
   * `'dynamic'` body that's its collider's centroid, which needn't be the
   * entity's origin; for every other body it's the entity's origin.
   * Defaults to `(0, 0)`.
   */
  velocity: Vector2;
  /**
   * The body's angular velocity, in radians/second. Positive turns
   * `+X` towards `+Y` (clockwise on screen). Defaults to `0`.
   */
  angularVelocity: number;
  /**
   * Damps `angularVelocity` each tick, proportional to itself; `0` disables
   * damping. Applied by {@link createEulerIntegrationEcsSystem}. Defaults
   * to `0`.
   */
  angularDrag: number;
  /**
   * Whether physics is kept from turning the body, for example to keep a
   * character's body upright. Collisions, joints, motors and torques move a
   * fixed-rotation `'dynamic'` body but never change its
   * `angularVelocity`: `getRigidBodyMassData` gives it an inverse moment of
   * inertia of `0`. An `angularVelocity` or rotation game code sets still
   * applies, so to lock a body that's already spinning, set its
   * `angularVelocity` to `0` too. Defaults to `false`.
   */
  fixedRotation: boolean;

  /**
   * How this body participates in the simulation. Defaults to `'dynamic'`.
   * See {@link RigidBodyType}.
   */
  type: RigidBodyType;

  /**
   * Whether the body may fall asleep. A body that can't sleep keeps its
   * whole island (every dynamic body it's connected to through contacts and
   * joints) awake, and setting it to `false` on a sleeping body wakes the
   * island. Use it for bodies the game moves every tick in ways the sleep
   * system can't see, such as a player character. Defaults to `true`.
   */
  canSleep: boolean;

  /**
   * A request to wake the body's island on `createSleepEcsSystem`'s next
   * run, for changes the sleep system can't see in the body's data: a joint
   * limit, a spring's stiffness, a collider's friction. Game code
   * sets it to `true` and never to `false`; the sleep system wakes the
   * island, restarts every member's `restTime` (so the island stays awake at
   * least the system's `restDuration`) and sets it back to `false`. Setting
   * it on an awake body keeps its island awake that long, and setting it on
   * a `'kinematic'` or `'static'` body wakes the sleeping bodies touching or
   * jointed to it. Starts at `false`.
   */
  wakeRequested: boolean;

  /**
   * Whether the body is asleep: left alone by gravity, collision
   * resolution, joints, springs, dampers, motors, integration and
   * continuous collision until something disturbs it. Output, written only
   * by `createSleepEcsSystem`, which only puts `'dynamic'` bodies to sleep.
   * Pass `true` to `addRigidBodyComponent` to create a `'dynamic'` body
   * asleep, such as a pile placed already settled. Defaults to `false`.
   */
  isSleeping: boolean;

  /**
   * How long, in seconds, the body has been resting: moving no faster than
   * the sleep system's resting speeds. Reset to `0` when it moves faster or
   * is woken. Output, written only by `createSleepEcsSystem`. Starts at `0`.
   */
  restTime: number;

  /**
   * The body's pose, links, collider, gravity and partners when it fell
   * asleep, which
   * `createSleepEcsSystem` and `isBodyAwake` compare against to notice that
   * it was disturbed. `null` while the body is awake, and for a body created
   * asleep until the sleep system first sees it. Output, written only by
   * `createSleepEcsSystem`.
   */
  sleepRecord: RigidBodySleepRecord | null;
}

/**
 * The options {@link addRigidBodyComponent} accepts: every field of
 * {@link RigidBodyEcsComponent} except the request and the outputs only
 * the sleep system writes after creation.
 */
export type RigidBodyOptions = Partial<
  Omit<RigidBodyEcsComponent, 'wakeRequested' | 'restTime' | 'sleepRecord'>
>;

export const rigidBodyId =
  createComponentId<RigidBodyEcsComponent>('f-rigid-body');

/**
 * Attaches a {@link RigidBodyEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the rigid body.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `options.isSleeping` is `true` and the body isn't
 * `'dynamic'` (only dynamic bodies sleep) or `options.canSleep` is `false`.
 */
export function addRigidBodyComponent(
  world: EcsWorld,
  entity: number,
  options: RigidBodyOptions = {},
): RigidBodyEcsComponent {
  const defaultRigidBodyOptions: Required<RigidBodyOptions> = {
    velocity: Vec2.zero,
    angularVelocity: 0,
    angularDrag: 0,
    fixedRotation: false,
    type: 'dynamic',
    canSleep: true,
    isSleeping: false,
  };

  const resolvedOptions = withDefaults(defaultRigidBodyOptions, options);

  if (resolvedOptions.isSleeping && resolvedOptions.type !== 'dynamic') {
    throw new Error(
      `Unable to add a sleeping ${resolvedOptions.type} rigid body to entity ${formatEntity(entity)}, only dynamic bodies sleep.`,
    );
  }

  if (resolvedOptions.isSleeping && !resolvedOptions.canSleep) {
    throw new Error(
      `Unable to add a sleeping rigid body to entity ${formatEntity(entity)}, its canSleep is false.`,
    );
  }

  // A new body is awake unless it's created asleep, so a wake request at
  // creation means nothing, and it has rested for no time yet. A body
  // created asleep gets its sleep record when the sleep system first sees
  // it, since its links aren't known before then.
  const component: RigidBodyEcsComponent = {
    ...resolvedOptions,
    wakeRequested: false,
    restTime: 0,
    sleepRecord: null,
  };

  return world.addComponent(entity, rigidBodyId, component);
}
