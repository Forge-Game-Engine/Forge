import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld, QueryResult } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { sweepCircleCircle } from '../ccd/sweep-circle-circle.js';
import { sweepCirclePolygon } from '../ccd/sweep-circle-polygon.js';
import { sweepCircleTerrain } from '../ccd/sweep-circle-terrain.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { AabbEcsComponent, aabbId } from '../components/aabb-component.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';
import { SweepHit } from '../types/sweep-hit.js';

/**
 * Tuneable options for `createContinuousCollisionEcsSystem`.
 */
export interface ContinuousCollisionOptions {
  /**
   * How far a dynamic circle body must travel in a single tick - relative
   * to its own collider's radius - before it's swept against nearby static
   * bodies instead of relying on next tick's ordinary discrete detection.
   * Defaults to `0.15`: the design document's own diagnosed reproduction
   * (a `wheelRadius: 100` Car demo wheel translating ~20-25 units per tick
   * at its measured 1200-1500 unit/second range) sits at a ratio of
   * `0.2`-`0.25`, so `0.5` - the initial estimate, in the same order of
   * magnitude as Box2D's and Bullet Physics's own automatic fast-body
   * heuristics - turned out too high to actually catch it; `0.15` catches
   * that whole measured range with margin to spare while still skipping
   * genuinely slow-moving bodies.
   */
  continuousDetectionThreshold: number;
}

const defaultContinuousCollisionOptions: ContinuousCollisionOptions = {
  continuousDetectionThreshold: 0.15,
};

type SweepDetector = (
  circleBody: CollisionBody,
  staticBody: CollisionBody,
  start: Vector2,
  end: Vector2,
) => SweepHit | null;

const sweepDetectors = new Map<string, SweepDetector>([
  ['circle', sweepCircleCircle],
  ['polygon', sweepCirclePolygon],
  ['terrain', sweepCircleTerrain],
]);

/**
 * A static target for continuous collision is any entity whose
 * `RigidBodyEcsComponent.type` is not `'dynamic'` - matching the same
 * convention `createCollisionResolutionEcsSystem`'s
 * `getRigidBodyInverseMass` and the rest of the solver already use, where a
 * collider entity with no `RigidBodyEcsComponent` at all is also static.
 * Dynamic-vs-dynamic sweeping is out of scope (see the design document's
 * §2/§7 DL-5): a two-moving-body sweep needs both endpoints to move during
 * the query, which this simpler "sweep against a fixed target" primitive
 * set doesn't support.
 */
function isStaticTarget(world: EcsWorld, entity: number): boolean {
  const rigidBody = world.getComponent(entity, rigidBodyId);

  return rigidBody === null || rigidBody.type !== 'dynamic';
}

type StaticCandidateQueryResult = QueryResult<
  [
    PositionEcsComponent,
    RotationEcsComponent,
    ColliderEcsComponent,
    AabbEcsComponent,
  ]
>;

/**
 * Sweeps `circleBody` against every entity in `candidates` that's both a
 * {@link isStaticTarget} and whose `AabbEcsComponent` overlaps `sweptAabb`,
 * keeping the earliest resulting time of impact (TOI), if any.
 */
function findEarliestSweepHit(
  world: EcsWorld,
  candidates: StaticCandidateQueryResult,
  movingEntity: number,
  circleBody: CollisionBody,
  sweptAabb: Aabb,
  startPosition: Vector2,
  endPosition: Vector2,
): SweepHit | null {
  let earliestHit: SweepHit | null = null;

  for (let j = 0; j < candidates.entities.length; j++) {
    const candidateEntity = candidates.entities[j];

    if (
      candidateEntity === movingEntity ||
      !isStaticTarget(world, candidateEntity)
    ) {
      continue;
    }

    if (!aabbsOverlap(sweptAabb, candidates.components[3][j])) {
      continue;
    }

    const staticCollider = candidates.components[2][j].collider;
    const detector = sweepDetectors.get(staticCollider.type);

    if (!detector) {
      continue;
    }

    const staticBody: CollisionBody = {
      position: candidates.components[0][j].world,
      rotation: candidates.components[1][j].world,
      collider: staticCollider,
    };
    const hit = detector(circleBody, staticBody, startPosition, endPosition);

    if (hit !== null && (earliestHit === null || hit.t < earliestHit.t)) {
      earliestHit = hit;
    }
  }

  return earliestHit;
}

/**
 * The bounding box a swept circle could possibly reach, spanning both its
 * start and end position, inflated by `radius` - used to cheaply filter
 * which of the world's static bodies are even worth a full sweep test
 * against, the same way `createBroadPhaseEcsSystem` filters collision pairs
 * before running narrow-phase.
 */
function computeSweptAabb(
  radius: number,
  offset: Vector2,
  start: Vector2,
  end: Vector2,
): Aabb {
  const centerStart = Vec2.add(Vec2.clone(start), offset);
  const centerEnd = Vec2.add(Vec2.clone(end), offset);

  return {
    min: {
      x: Math.min(centerStart.x, centerEnd.x) - radius,
      y: Math.min(centerStart.y, centerEnd.y) - radius,
    },
    max: {
      x: Math.max(centerStart.x, centerEnd.x) + radius,
      y: Math.max(centerStart.y, centerEnd.y) + radius,
    },
  };
}

/**
 * Creates an ECS system that prevents a fast-moving dynamic `CircleCollider`
 * body from tunneling through a static `PolygonCollider`/`TerrainCollider`/
 * `CircleCollider` body within a single tick, by sweeping it against nearby
 * static bodies and clamping its translation to stop at the earliest time
 * of impact (TOI), if any. Must run after every system that can change
 * `velocity` this tick (gravity, joints, motors,
 * `createCollisionResolutionEcsSystem`) and before
 * `createEulerIntegrationEcsSystem`, whose `velocity * deltaTime`
 * translation this system's clamp overrides for the ticks it fires on.
 *
 * A body only pays for a sweep on ticks where it's actually moving fast
 * enough to risk tunneling (see {@link ContinuousCollisionOptions}); slower
 * ticks are untouched, and rely on the ordinary discrete broad/narrow-phase
 * pipeline as before. The clamp itself only stops the body at the surface -
 * it doesn't resolve the resulting contact - so the next tick's ordinary
 * pipeline picks up a small, correctly-signed overlap and resolves it
 * (with warm-starting) exactly as it would any other contact.
 * @param time - Used to read the tick's delta time.
 * @param options - Tuning overrides; see {@link ContinuousCollisionOptions}.
 * @returns An ECS system that clamps fast dynamic circle bodies' translation
 * every tick.
 */
export const createContinuousCollisionEcsSystem = (
  time: Time,
  options: Partial<ContinuousCollisionOptions> = {},
): EcsSystem<
  [
    PositionEcsComponent,
    RotationEcsComponent,
    RigidBodyEcsComponent,
    ColliderEcsComponent,
    AabbEcsComponent,
  ]
> => {
  const resolvedOptions: ContinuousCollisionOptions = {
    ...defaultContinuousCollisionOptions,
    ...options,
  };

  return {
    query: [positionId, rotationId, rigidBodyId, colliderId, aabbId],
    update: (
      world,
      { entities, components: [positions, rotations, rigidBodies, colliders] },
    ) => {
      const dt = time.deltaTimeInSeconds;

      if (dt <= 0) {
        return;
      }

      const candidates = world.query<
        [
          PositionEcsComponent,
          RotationEcsComponent,
          ColliderEcsComponent,
          AabbEcsComponent,
        ]
      >([positionId, rotationId, colliderId, aabbId]);

      for (let i = 0; i < entities.length; i++) {
        const rigidBody = rigidBodies[i];
        const collider = colliders[i].collider;

        if (
          rigidBody.type !== 'dynamic' ||
          !rigidBody.continuousDetection ||
          collider.type !== 'circle'
        ) {
          continue;
        }

        const circleCollider = collider as CircleCollider;
        const startPosition = positions[i].world;
        // Clone before scaling: `rigidBody.velocity` is the body's live
        // velocity state, not a disposable value.
        const translation = Vec2.multiply(Vec2.clone(rigidBody.velocity), dt);

        if (
          Vec2.magnitude(translation) <=
          resolvedOptions.continuousDetectionThreshold * circleCollider.radius
        ) {
          continue;
        }

        const endPosition = Vec2.add(Vec2.clone(startPosition), translation);
        const sweptAabb = computeSweptAabb(
          circleCollider.radius,
          circleCollider.offset,
          startPosition,
          endPosition,
        );
        const circleBody: CollisionBody = {
          position: startPosition,
          rotation: rotations[i].world,
          collider,
        };

        const earliestHit = findEarliestSweepHit(
          world,
          candidates,
          entities[i],
          circleBody,
          sweptAabb,
          startPosition,
          endPosition,
        );

        // A `t` of exactly `0` means the body already touches the target at
        // `startPosition` - the same position this tick's earlier
        // broad/narrow-phase already saw, so `createCollisionResolutionEcsSystem`
        // already resolved that exact contact this tick (including letting a
        // grounded, fast-*rolling* body keep its tangential velocity - only
        // its into-the-surface component gets corrected). Clamping the
        // *entire* translation to zero here would freeze that legitimate
        // rolling motion solid, mistaking "fast because it's rolling" for
        // "about to tunnel." Only a hit strictly after the start
        // (`t` in `(0, 1]`) is this system's own job: a crossing ordinary
        // detection couldn't have seen yet, because it hasn't happened yet
        // at `startPosition`.
        if (earliestHit !== null && earliestHit.t > 0) {
          rigidBody.continuousCollisionTranslationClamp = Vec2.multiply(
            translation,
            earliestHit.t,
          );
        }
      }
    },
  };
};
