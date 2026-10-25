import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { degreesToRadians, Vec2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { canMotorTurnBody } from '../can-motor-turn-body.js';
import {
  AngularVelocityMotorEcsComponent,
  angularVelocityMotorId,
} from '../components/angular-velocity-motor-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
  RigidBodySleepRecord,
} from '../components/rigidbody-component.js';
import {
  isBodyAwake,
  isRigidBodyAwake,
  isSleepingBodyDisturbed,
} from '../is-body-awake.js';
import { islandLinkComponents, TwoBodyLink } from '../islands/island-links.js';
import { UnionFind } from '../islands/union-find.js';
import { hasJointBody } from '../joints/has-joint-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';

/**
 * Tuneable thresholds for `createSleepEcsSystem`.
 */
export interface SleepOptions {
  /**
   * The fastest a body's center of mass may move, in world units per
   * second, and still count as resting. The default, Box2D's
   * `b2_linearSleepTolerance`, assumes meters-scale world units, like
   * `CollisionResolutionOptions.maxBiasSpeed`: scale it up roughly in
   * proportion to how much larger a typical body is in your world than a
   * meter (a world at 100 units per meter wants about `1`).
   */
  maxRestingSpeed: number;

  /**
   * The fastest a body may turn, in radians per second, and still count as
   * resting. Defaults to 2 degrees per second, Box2D's
   * `b2_angularSleepTolerance`. Angles don't depend on the world's scale.
   */
  maxRestingAngularSpeed: number;

  /**
   * How long, in seconds, every body of an island must rest before the
   * island falls asleep. Defaults to `0.5`, Box2D's `b2_timeToSleep`.
   */
  restDuration: number;
}

const defaultSleepOptions: SleepOptions = {
  maxRestingSpeed: 0.01,
  maxRestingAngularSpeed: degreesToRadians(2),
  restDuration: 0.5,
};

/**
 * The working memory of one run of the sleep system, thrown away at the end
 * of it. Indices are positions in the system's batch.
 */
interface SleepTick {
  readonly world: EcsWorld;
  readonly bodies: readonly RigidBodyEcsComponent[];
  readonly positions: readonly PositionEcsComponent[];
  readonly rotations: readonly RotationEcsComponent[];
  readonly indexOf: ReadonlyMap<number, number>;
  readonly isDynamic: Uint8Array;
  /** Non-dynamic bodies that wake every dynamic body linked to them. */
  readonly wakesNeighbors: Uint8Array;
  /** Dynamic bodies whose island wakes, or stays awake, this run. */
  readonly woken: Uint8Array;
  /** Dynamic bodies a motor turns, which don't count as resting. */
  readonly driven: Uint8Array;
  /** Each dynamic body's links: other entities and joint entities. */
  readonly links: number[][];
  /** Each dynamic body's collision manifolds this step. */
  readonly manifolds: CollisionManifold[][];
  readonly islands: UnionFind;
}

/**
 * Creates an ECS system that puts resting `'dynamic'` rigid bodies to sleep
 * and wakes them when they're disturbed. It's the only writer of
 * `RigidBodyEcsComponent.isSleeping`, `restTime` and `sleepRecord`, and the
 * only code that sets `wakeRequested` back to `false`.
 *
 * Bodies sleep per island: the dynamic bodies connected by this step's
 * collision manifolds and by revolute joints, prismatic joints, linear
 * springs and linear dampers. Static and kinematic bodies (and
 * collider-only entities) don't join islands, so two bodies resting on the
 * same floor are separate islands. A body is resting while its `velocity` is
 * no faster than `maxRestingSpeed`, its `angularVelocity` no faster than
 * `maxRestingAngularSpeed`, its `canSleep` is `true` and it has no
 * `AngularVelocityMotorEcsComponent` turning it towards a non-zero
 * `targetVelocity` (a motor stalled against a wall still drives its body);
 * its `restTime` counts how long. When every body of an island has rested for
 * `restDuration`, the system zeroes their velocities, sets `isSleeping` and
 * records each body's `local` pose, links and collision manifolds in its
 * `sleepRecord`. The physics systems that change velocity or pose then
 * leave the island alone (see `isBodyAwake`), and the narrow phase reuses
 * the recorded manifolds instead of testing the island's contacts again.
 *
 * A sleeping island wakes, and every member's `restTime` restarts at `0`,
 * when any member:
 * - has a non-zero `velocity` or `angularVelocity` (game code,
 *   `applyImpulse`, `applyTorque`, a solver), or a `position.local` or
 *   `rotation.local` different from its record (a teleport);
 * - has `canSleep` set to `false` or `wakeRequested` set to `true`;
 * - has an angular velocity motor whose `targetVelocity` was set to
 *   something other than `0`;
 * - gains or loses a link: a new contact, a removed support or collider, a
 *   joint added or removed;
 * - is linked to an awake body, a `'kinematic'` body with a velocity, or a
 *   body whose `type` stopped being `'dynamic'`.
 *
 * A body whose `type` isn't `'dynamic'` never sleeps: the system clears
 * `isSleeping` on one that changed type. A body created with
 * `isSleeping: true` gets its record the first time the system sees it.
 * In the fixed-update group, a paused game (`timeScale` `0`) runs no fixed
 * steps, so the system doesn't run and nothing wakes or falls asleep until
 * the game resumes. Run outside a fixed step while
 * `time.deltaTimeInSeconds` is `0`, rest times don't change and nothing
 * falls asleep, but disturbed islands still wake.
 *
 * Register it in the fixed-update group (`registerFixedUpdate`) after
 * `createNarrowPhaseEcsSystem`, so it reads this step's
 * `collisionManifolds` and a body hit this step wakes before the solver
 * runs, and before every system that changes velocity
 * (`createGravityEcsSystem`, the spring and damper systems,
 * `createCollisionResolutionEcsSystem`, the joint systems,
 * `createAngularVelocityMotorEcsSystem` and
 * `createEulerIntegrationEcsSystem`). Game code that changes physics input
 * runs in the default group, or in the fixed-update group before its
 * transform system.
 * @param collisionManifolds - The narrow-phase system's output: this step's
 * confirmed collisions.
 * @param time - Used to read the step's delta time.
 * @param options - Threshold overrides; see {@link SleepOptions}.
 * @returns An ECS system that puts resting islands to sleep and wakes
 * disturbed ones every step.
 * @throws An error if an option is negative or not finite.
 */
export const createSleepEcsSystem = (
  collisionManifolds: readonly CollisionManifold[],
  time: Time,
  options: Partial<SleepOptions> = {},
): EcsSystem<
  [RigidBodyEcsComponent, PositionEcsComponent, RotationEcsComponent]
> => {
  const resolvedOptions: SleepOptions = withDefaults(
    defaultSleepOptions,
    options,
  );

  for (const [name, value] of Object.entries(resolvedOptions)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Unable to create the sleep system, its ${name} option must be a finite, non-negative number but was ${value}.`,
      );
    }
  }

  return {
    query: [rigidBodyId, positionId, rotationId],
    update: (
      world,
      { entities, components: [bodies, positions, rotations] },
    ) => {
      const count = entities.length;
      const indexOf = new Map<number, number>();

      for (let i = 0; i < count; i++) {
        indexOf.set(entities[i], i);
      }

      const tick: SleepTick = {
        world,
        bodies,
        positions,
        rotations,
        indexOf,
        isDynamic: new Uint8Array(count),
        wakesNeighbors: new Uint8Array(count),
        woken: new Uint8Array(count),
        driven: new Uint8Array(count),
        links: Array.from({ length: count }, (): number[] => []),
        manifolds: Array.from({ length: count }, (): CollisionManifold[] => []),
        islands: new UnionFind(count),
      };

      readWakeRequests(tick);
      readMotors(tick);
      linkContacts(tick, collisionManifolds);
      linkJoints(tick);
      wakeOnLinkChanges(tick);

      for (const members of groupIslands(tick)) {
        updateIsland(tick, members, time.deltaTimeInSeconds, resolvedOptions);
      }
    },
  };
};

/**
 * Consumes every body's wake request, clears `isSleeping` on bodies that
 * stopped being dynamic, and marks requested or disturbed sleeping bodies
 * as woken.
 */
function readWakeRequests(tick: SleepTick): void {
  const { bodies, positions, rotations, isDynamic, wakesNeighbors, woken } =
    tick;

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const requested = body.wakeRequested;

    if (requested) {
      body.wakeRequested = false;
    }

    if (body.type !== 'dynamic') {
      body.restTime = 0;

      if (body.isSleeping || requested) {
        body.isSleeping = false;
        body.sleepRecord = null;
        wakesNeighbors[i] = 1;
      }

      continue;
    }

    isDynamic[i] = 1;

    if (
      requested ||
      (body.isSleeping &&
        isSleepingBodyDisturbed(body, positions[i], rotations[i]))
    ) {
      woken[i] = 1;
    }
  }
}

/**
 * Marks every dynamic body a motor turns towards a non-zero target as
 * driven, and wakes it if it's asleep, so the motor turns it with its
 * contacts solved. A motor is a force applied every step: a body it drives
 * isn't resting even while something stalls it.
 */
function readMotors(tick: SleepTick): void {
  const { world, bodies, indexOf, driven, woken } = tick;
  const {
    entities: motorEntities,
    components: [motors],
  } = world.query<[AngularVelocityMotorEcsComponent]>([angularVelocityMotorId]);

  for (let i = 0; i < motorEntities.length; i++) {
    const index = indexOf.get(motorEntities[i]);
    const motor = motors[i];

    if (
      index === undefined ||
      motor.targetVelocity === 0 ||
      !canMotorTurnBody(motor, bodies[index])
    ) {
      continue;
    }

    driven[index] = 1;

    if (bodies[index].isSleeping) {
      woken[index] = 1;
    }
  }
}

function linkContacts(
  tick: SleepTick,
  collisionManifolds: readonly CollisionManifold[],
): void {
  const { indexOf, isDynamic, manifolds } = tick;

  for (const manifold of collisionManifolds) {
    const { entityA, entityB } = manifold;

    linkBodies(tick, entityA, entityB, entityB, entityA);

    for (const entity of [entityA, entityB]) {
      const index = indexOf.get(entity);

      if (index !== undefined && isDynamic[index] === 1) {
        manifolds[index].push(manifold);
      }
    }
  }
}

/**
 * Links the two bodies of every joint, spring and damper the joint systems
 * would solve this step.
 */
function linkJoints(tick: SleepTick): void {
  const { world } = tick;

  for (const key of islandLinkComponents) {
    const {
      entities: jointEntities,
      components: [joints],
    } = world.query<[TwoBodyLink]>([key]);

    for (let i = 0; i < jointEntities.length; i++) {
      const { entityA, entityB } = joints[i];

      if (hasJointBody(world, entityA) && hasJointBody(world, entityB)) {
        linkBodies(tick, entityA, entityB, jointEntities[i], jointEntities[i]);
      }
    }
  }
}

/**
 * Records a link on each dynamic side and joins two dynamic bodies' islands.
 * A dynamic body linked to a non-dynamic one that's moving (or changed
 * type, or was asked to wake) is woken instead, since static and kinematic
 * bodies don't join islands.
 */
function linkBodies(
  tick: SleepTick,
  entityA: number,
  entityB: number,
  linkForA: number,
  linkForB: number,
): void {
  const { indexOf, isDynamic, links, islands, woken } = tick;
  const indexA = indexOf.get(entityA);
  const indexB = indexOf.get(entityB);
  const dynamicA = indexA !== undefined && isDynamic[indexA] === 1;
  const dynamicB = indexB !== undefined && isDynamic[indexB] === 1;

  if (dynamicA) {
    links[indexA].push(linkForA);
  }

  if (dynamicB) {
    links[indexB].push(linkForB);
  }

  if (dynamicA && dynamicB) {
    islands.union(indexA, indexB);

    return;
  }

  if (dynamicA && wakesLinkedBodies(tick, entityB, indexB)) {
    woken[indexA] = 1;
  }

  if (dynamicB && wakesLinkedBodies(tick, entityA, indexA)) {
    woken[indexB] = 1;
  }
}

/**
 * Whether a body outside an island wakes the dynamic bodies linked to it: a
 * moving kinematic body, a body that stopped being dynamic or was asked to
 * wake this step, or a dynamic body the system doesn't simulate (one with
 * no `RotationEcsComponent`).
 */
function wakesLinkedBodies(
  tick: SleepTick,
  entity: number,
  index: number | undefined,
): boolean {
  if (index === undefined) {
    return isBodyAwake(tick.world, entity);
  }

  return (
    tick.wakesNeighbors[index] === 1 ||
    isRigidBodyAwake(
      tick.bodies[index],
      tick.positions[index],
      tick.rotations[index],
    )
  );
}

/**
 * Sorts and de-duplicates every dynamic body's links, and wakes a sleeping
 * body whose links differ from the ones it fell asleep with.
 */
function wakeOnLinkChanges(tick: SleepTick): void {
  const { bodies, isDynamic, links, woken } = tick;

  for (let i = 0; i < bodies.length; i++) {
    if (isDynamic[i] === 0) {
      continue;
    }

    links[i] = sortedUnique(links[i]);

    const record = bodies[i].sleepRecord;

    if (
      bodies[i].isSleeping &&
      record !== null &&
      !haveSameItems(links[i], record.links)
    ) {
      woken[i] = 1;
    }
  }
}

function groupIslands(tick: SleepTick): number[][] {
  const { isDynamic, islands } = tick;
  const membersByRoot = new Map<number, number[]>();

  for (let i = 0; i < isDynamic.length; i++) {
    if (isDynamic[i] === 0) {
      continue;
    }

    const root = islands.find(i);
    const members = membersByRoot.get(root);

    if (members === undefined) {
      membersByRoot.set(root, [i]);
    } else {
      members.push(i);
    }
  }

  return [...membersByRoot.values()];
}

/**
 * Keeps a sleeping island asleep, or wakes it, then advances an awake
 * island's rest times and puts it to sleep once every member has rested
 * for `restDuration`.
 */
function updateIsland(
  tick: SleepTick,
  members: readonly number[],
  dt: number,
  options: SleepOptions,
): void {
  const { bodies, woken, driven } = tick;
  const isWoken = members.some((i) => woken[i] === 1);

  if (!isWoken && members.every((i) => bodies[i].isSleeping)) {
    for (const i of members) {
      // A body created asleep is recorded the first time it's seen.
      bodies[i].sleepRecord ??= createSleepRecord(tick, i);
    }

    return;
  }

  for (const i of members) {
    const body = bodies[i];

    if (body.isSleeping || isWoken) {
      body.isSleeping = false;
      body.sleepRecord = null;
      body.restTime = 0;
    }
  }

  if (dt <= 0) {
    return;
  }

  let minimumRestTime = Infinity;

  for (const i of members) {
    const body = bodies[i];

    body.restTime =
      driven[i] === 0 && isResting(body, options) ? body.restTime + dt : 0;
    minimumRestTime = Math.min(minimumRestTime, body.restTime);
  }

  if (minimumRestTime < options.restDuration) {
    return;
  }

  for (const i of members) {
    const body = bodies[i];

    body.velocity.x = 0;
    body.velocity.y = 0;
    body.angularVelocity = 0;
    body.isSleeping = true;
    body.sleepRecord = createSleepRecord(tick, i);
  }
}

function isResting(
  body: RigidBodyEcsComponent,
  options: SleepOptions,
): boolean {
  return (
    body.canSleep &&
    Vec2.magnitude(body.velocity) <= options.maxRestingSpeed &&
    Math.abs(body.angularVelocity) <= options.maxRestingAngularSpeed
  );
}

function createSleepRecord(
  tick: SleepTick,
  index: number,
): RigidBodySleepRecord {
  const { local } = tick.positions[index];

  return {
    position: { x: local.x, y: local.y },
    rotation: tick.rotations[index].local,
    links: tick.links[index],
    manifolds: tick.manifolds[index],
  };
}

function sortedUnique(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.filter((value, i) => i === 0 || value !== sorted[i - 1]);
}

function haveSameItems(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}
