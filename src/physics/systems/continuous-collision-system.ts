import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { findBroadPhase } from '../broad-phase/create-broad-phase.js';
import { DynamicAabbTree } from '../broad-phase/dynamic-aabb-tree.js';
import { circleSweepHitFinders } from '../ccd/circle-sweep-hits.js';
import { getColliderRotation } from '../collider-rotation.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { collidersCanCollide } from '../collision/collision-filter.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isRigidBodyAwake } from '../is-body-awake.js';
import { Aabb } from '../types/aabb.js';

/**
 * How deep, as a fraction of its radius, a circle may sink into a static
 * collider in one step before the sweep steps in. Shallower penetrations
 * are left to the discrete pipeline, whose next collision-resolution pass
 * pushes them back out within a step or two. Stepping in for those as well
 * would cut short the step's travel every time a fast body rolls over a
 * slight bend in the ground, which shows as stutter.
 */
const maxDiscretePenetrationRatio = 0.1;

/**
 * How deep, as a fraction of its radius, a swept circle is left inside the
 * surface it hit. Leaving it slightly inside, rather than exactly touching,
 * gives the next step's narrow phase an overlap to report, so the
 * collision resolution system can stop it; a body left just short of the
 * surface would be swept and stopped again every step without ever
 * reaching it.
 */
const contactDepthRatio = 0.01;

/**
 * Creates an ECS system that stops fast dynamic circles from passing into
 * or through static colliders between two physics steps (continuous
 * collision detection).
 *
 * Narrow-phase collision only tests where each body is at the start of a
 * step, so a body that integration then moves further than the gap to a
 * surface ends up deep inside it, or out the other side, before the next
 * step's test runs. This system sweeps the center of each dynamic body's
 * {@link CircleCollider} (which is the body's center of mass) from where
 * this step's collision detection saw it (`position.world` and
 * `rotation.world`) to where integration just moved it (`position.local`
 * and `rotation.local`) in a straight line, against every static collider
 * the broad phase's static tree returns for the box around that path, whose
 * `aabb` overlaps the box and whose category and mask let it collide with
 * the circle. The static tree holds the colliders that were static (no
 * `RigidBodyEcsComponent`, or a `'static'` one) when this step's
 * `createBroadPhaseEcsSystem` ran, so a static collider created after that,
 * or one that became static, isn't swept against until the broad phase has
 * run again, just as its `aabb` isn't computed until then. Sensors are
 * never swept and never stop anything, since nothing is resolved against
 * them. If it would sink more than a tenth of its radius into one, the
 * system moves `position.local` back so the circle's center is where the
 * circle first touched that collider, leaving it just inside the surface.
 * Rotation and velocity are left alone: the next step's narrow phase
 * reports that contact and collision resolution responds to it (friction,
 * restitution) as it does for any other.
 *
 * The world needs a broad phase (see `createBroadPhase`), kept up to date
 * by `createBroadPhaseEcsSystem` earlier in the same fixed-update group.
 * Register this system in that group, directly after
 * `createEulerIntegrationEcsSystem`, whose output it checks. A body moved
 * directly (a teleport) must be moved before the step's transform pass
 * (the `createTransformEcsSystem` registered first in the fixed-update
 * group) runs, or the sweep treats the jump as motion and can stop it at a
 * wall in between. A teleport made in the default group always is: the
 * next step's transform pass copies it into `world` first. A swept body
 * keeps its full velocity but covers less ground this step, the same trade
 * Box2D makes.
 * Polygon bodies and kinematic or dynamic targets aren't swept, and
 * neither are bodies that aren't awake (see {@link isBodyAwake}):
 * integration skips them, so they haven't moved. A sleeping body that was
 * disturbed this step counts as awake, so integration moves it and this
 * system sweeps it.
 * @returns The ECS system.
 * @throws An error on update if the world has no broad phase (see
 * `createBroadPhase`), or more than one.
 */
export const createContinuousCollisionEcsSystem = (): EcsSystem<
  [PositionEcsComponent, ColliderEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [positionId, colliderId, rigidBodyId],
  update: (
    world,
    { entities, components: [positions, colliders, rigidBodies] },
  ) => {
    // Rotation is optional for colliders, so it can't be part of the query.
    const getRotation =
      world.getComponentAccessor<RotationEcsComponent>(rotationId);
    const targets: SweepTargets = {
      staticTree: findBroadPhase(world).staticTree,
      getPosition: world.getComponentAccessor<PositionEcsComponent>(positionId),
      getCollider: world.getComponentAccessor<ColliderEcsComponent>(colliderId),
      getRotation,
    };

    for (let i = 0; i < entities.length; i++) {
      const mover = colliders[i];
      const rigidBody = rigidBodies[i];

      if (
        mover.sensor ||
        rigidBody.type !== 'dynamic' ||
        !(mover.collider instanceof CircleCollider)
      ) {
        continue;
      }

      const circle = mover.collider;
      const position = positions[i];
      const rotation = getRotation(entities[i]);

      // A sleeping body wasn't integrated, so it hasn't moved since this
      // step's transform pass and there's nothing to sweep.
      if (
        !isRigidBodyAwake(world, entities[i], rigidBody, position, rotation)
      ) {
        continue;
      }

      const start = circle.getWorldCenter(
        position.world,
        getColliderRotation(rotation),
      );
      const endRotation = rotation === null ? 0 : rotation.local;
      const end = circle.getWorldCenter(position.local, endRotation);
      const stopT = findStopT(entities[i], mover, circle, start, end, targets);

      if (stopT < 1) {
        // Move the origin so the circle's center lands at the stop point,
        // keeping the rotation integration produced.
        const stopCenter = Vec2.add(
          Vec2.multiply(Vec2.subtract(end, start), stopT),
          start,
        );
        const centerOffset = Vec2.subtract(
          circle.getWorldCenter(position.local, endRotation),
          position.local,
        );

        Vec2.subtract(stopCenter, centerOffset);
        position.local.x = stopCenter.x;
        position.local.y = stopCenter.y;
      }
    }
  },
});

/**
 * Where a sweep finds the static colliders it may hit.
 */
interface SweepTargets {
  /** The broad phase's static colliders, each valued by its entity. */
  readonly staticTree: DynamicAabbTree<number>;
  readonly getPosition: (entity: number) => PositionEcsComponent | null;
  readonly getCollider: (entity: number) => ColliderEcsComponent | null;
  readonly getRotation: (entity: number) => RotationEcsComponent | null;
}

/**
 * Finds how far along this step's motion, from `0` to `1`, a circle should
 * stop so that it ends up just inside the first static collider it would
 * otherwise sink deeply into.
 * @param moverEntity - The moving circle's entity.
 * @param mover - The moving circle's collider component, for its category
 * and mask.
 * @param collider - The moving circle.
 * @param start - The circle's world center at the start of the step.
 * @param end - The circle's world center after this step's integration.
 * @param targets - The broad phase's static tree and the components its
 * colliders are read from.
 * @returns The fraction of the motion to keep; `1` keeps all of it.
 */
function findStopT(
  moverEntity: number,
  mover: ColliderEcsComponent,
  collider: CircleCollider,
  start: Vector2,
  end: Vector2,
  targets: SweepTargets,
): number {
  // Clone before subtracting: `end` is read again below.
  const translation = Vec2.subtract(Vec2.clone(end), start);
  const distance = Vec2.magnitude(translation);

  // A `NaN` motion has no box the tree can be queried with.
  if (
    Number.isNaN(distance) ||
    distance <= maxDiscretePenetrationRatio * collider.radius
  ) {
    return 1;
  }

  const sweep: CircleSweep = {
    mover,
    collider,
    start,
    end,
    translation,
    box: computeSweptAabb(collider, start, end),
  };
  let stopT = 1;

  // Every candidate is visited: the query never stops early.
  targets.staticTree.query(sweep.box, (_proxyId, entity) => {
    // A body made dynamic since the broad phase ran is still in the static
    // tree until its next run, and isn't swept against itself.
    if (entity !== moverEntity) {
      stopT = Math.min(stopT, findTargetStopT(sweep, targets, entity));
    }

    return true;
  });

  return stopT;
}

/**
 * One fast circle's motion this step.
 */
interface CircleSweep {
  /** The moving circle's collider component. */
  readonly mover: ColliderEcsComponent;
  /** The moving circle. */
  readonly collider: CircleCollider;
  /** The circle's world center at the start of the step. */
  readonly start: Vector2;
  /** The circle's world center after this step's integration. */
  readonly end: Vector2;
  /** `end` minus `start`. */
  readonly translation: Vector2;
  /** The box the circle covers along the whole motion. */
  readonly box: Aabb;
}

/**
 * Finds how far along a sweep's motion, from `0` to `1`, the circle should
 * stop so that it ends up just inside one static collider the static tree
 * returned.
 * @param sweep - The circle's motion.
 * @param targets - Where the static collider's components are read from.
 * @param entity - The static collider's entity.
 * @returns The fraction of the motion to keep; `1` if the circle doesn't
 * sink deeply into the collider.
 */
function findTargetStopT(
  sweep: CircleSweep,
  targets: SweepTargets,
  entity: number,
): number {
  const { mover, collider, start, end, translation, box } = sweep;
  const target = targets.getCollider(entity);
  const position = targets.getPosition(entity);

  // The tree's boxes are fattened, so a hit is checked against the
  // collider's own `aabb`. An entity removed or stripped of its collider
  // since the broad phase ran is still in the tree until its next run.
  if (
    target === null ||
    position === null ||
    target.sensor ||
    !collidersCanCollide(mover, target) ||
    !aabbsOverlap(box, target.aabb)
  ) {
    return 1;
  }

  const hits = circleSweepHitFinders[target.collider.type](
    collider,
    {
      position: position.world,
      rotation: getColliderRotation(targets.getRotation(entity)),
      collider: target.collider,
    },
    start,
    end,
  );
  const maxDiscretePenetration = maxDiscretePenetrationRatio * collider.radius;
  let stopT = 1;

  for (const hit of hits) {
    const approach = -Vec2.dot(translation, hit.normal);

    // A graze, or a surface the circle wouldn't sink deeply into by the
    // end of the step, is left to the discrete pipeline.
    if (approach * (1 - hit.t) <= maxDiscretePenetration) {
      continue;
    }

    stopT = Math.min(
      stopT,
      hit.t + (contactDepthRatio * collider.radius) / approach,
    );
  }

  return stopT;
}

function computeSweptAabb(
  collider: CircleCollider,
  start: Vector2,
  end: Vector2,
): Aabb {
  const { radius } = collider;

  return {
    min: {
      x: Math.min(start.x, end.x) - radius,
      y: Math.min(start.y, end.y) - radius,
    },
    max: {
      x: Math.max(start.x, end.x) + radius,
      y: Math.max(start.y, end.y) + radius,
    },
  };
}
