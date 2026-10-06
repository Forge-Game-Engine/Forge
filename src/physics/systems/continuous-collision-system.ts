import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2, Vector2 } from '../../math/index.js';
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
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * How deep, as a fraction of its radius, a circle may sink into a static
 * collider in one tick before the sweep steps in. Shallower penetrations
 * are left to the discrete pipeline, whose next collision-resolution pass
 * pushes them back out within a tick or two. Stepping in for those as well
 * would cut short the tick's travel every time a fast body rolls over a
 * slight bend in the ground, which shows as stutter.
 */
const maxDiscretePenetrationRatio = 0.1;

/**
 * How deep, as a fraction of its radius, a swept circle is left inside the
 * surface it hit. Leaving it slightly inside, rather than exactly touching,
 * gives the next tick's narrow phase an overlap to report, so the
 * collision resolution system can stop it; a body left just short of the
 * surface would be swept and stopped again every tick without ever
 * reaching it.
 */
const contactDepthRatio = 0.01;

/**
 * Creates an ECS system that stops fast dynamic circles from passing into
 * or through static colliders between two ticks (continuous collision
 * detection).
 *
 * Narrow-phase collision only tests where each body is at the start of a
 * tick, so a body that integration then moves further than the gap to a
 * surface ends up deep inside it, or out the other side, before the next
 * tick's test runs. This system sweeps each dynamic body with a
 * {@link CircleCollider} from where this tick's collision detection saw it
 * (`position.world`) to where integration just moved it (`position.local`)
 * against every static collider (an entity with no
 * `RigidBodyEcsComponent`, or a `'static'` one) its path overlaps and its
 * category and mask let it collide with. Sensors are never swept and never
 * stop anything, since nothing is resolved against them. If it
 * would sink more than a tenth of its radius into one, the system moves
 * `position.local` back to where the circle first touched that collider,
 * leaving it just inside the surface. Velocity is left alone: the next
 * tick's narrow phase reports that contact and collision resolution
 * responds to it (friction, restitution) as it does for any other.
 *
 * Register it directly after `createEulerIntegrationEcsSystem`, whose
 * output it checks. A body moved directly (a teleport) must be moved
 * before `createTransformEcsSystem` runs, or the sweep treats the jump as
 * motion and can stop it at a wall in between. A swept body keeps its full
 * velocity but covers less ground this tick, the same trade Box2D makes.
 * Polygon bodies and kinematic or dynamic targets aren't swept.
 * @returns The ECS system.
 */
export const createContinuousCollisionEcsSystem = (): EcsSystem<
  [PositionEcsComponent, ColliderEcsComponent]
> => ({
  query: [positionId, colliderId],
  update: (world, { entities, components: [positions, colliders] }) => {
    // Rigid body and rotation are both optional for colliders (a collider
    // with no rigid body is static), so neither can be part of the query.
    const getRigidBody =
      world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);
    const getRotation =
      world.getComponentAccessor<RotationEcsComponent>(rotationId);

    const targets: SweepTarget[] = [];

    for (let i = 0; i < entities.length; i++) {
      const rigidBody = getRigidBody(entities[i]);

      if (
        !colliders[i].sensor &&
        (rigidBody === null || rigidBody.type === 'static')
      ) {
        targets.push({
          collider: colliders[i],
          body: {
            position: positions[i].world,
            rotation: getColliderRotation(getRotation(entities[i])),
            collider: colliders[i].collider,
          },
        });
      }
    }

    for (let i = 0; i < entities.length; i++) {
      const mover = colliders[i];

      if (
        mover.sensor ||
        getRigidBody(entities[i])?.type !== 'dynamic' ||
        !(mover.collider instanceof CircleCollider)
      ) {
        continue;
      }

      const start = positions[i].world;
      const end = positions[i].local;
      const stopT = findStopT(mover, mover.collider, start, end, targets);

      if (stopT < 1) {
        end.x = start.x + (end.x - start.x) * stopT;
        end.y = start.y + (end.y - start.y) * stopT;
      }
    }
  },
});

/**
 * A static collider a swept circle may hit.
 */
interface SweepTarget {
  collider: ColliderEcsComponent;
  body: CollisionBody;
}

/**
 * Finds how far along this tick's motion, from `0` to `1`, a circle should
 * stop so that it ends up just inside the first static collider it would
 * otherwise sink deeply into.
 * @param mover - The moving circle's collider component, for its category
 * and mask.
 * @param collider - The moving circle.
 * @param start - Where the circle's body was at the start of the tick.
 * @param end - Where integration moved the circle's body this tick.
 * @param targets - Every static collider in the world.
 * @returns The fraction of the motion to keep; `1` keeps all of it.
 */
function findStopT(
  mover: ColliderEcsComponent,
  collider: CircleCollider,
  start: Vector2,
  end: Vector2,
  targets: readonly SweepTarget[],
): number {
  // Clone before subtracting: `end` is the entity's live local position.
  const translation = Vec2.subtract(Vec2.clone(end), start);
  const maxDiscretePenetration = maxDiscretePenetrationRatio * collider.radius;

  if (Vec2.magnitude(translation) <= maxDiscretePenetration) {
    return 1;
  }

  const sweptAabb = computeSweptAabb(collider, start, end);
  let stopT = 1;

  for (const target of targets) {
    if (
      !collidersCanCollide(mover, target.collider) ||
      !aabbsOverlap(sweptAabb, target.collider.aabb)
    ) {
      continue;
    }

    const hits = circleSweepHitFinders[target.body.collider.type](
      collider,
      target.body,
      start,
      end,
    );

    for (const hit of hits) {
      const approach = -Vec2.dot(translation, hit.normal);

      // A graze, or a surface the circle wouldn't sink deeply into by the
      // end of the tick, is left to the discrete pipeline.
      if (approach * (1 - hit.t) <= maxDiscretePenetration) {
        continue;
      }

      stopT = Math.min(
        stopT,
        hit.t + (contactDepthRatio * collider.radius) / approach,
      );
    }
  }

  return stopT;
}

function computeSweptAabb(
  collider: CircleCollider,
  start: Vector2,
  end: Vector2,
): Aabb {
  const startAabb = collider.computeAabb(start);
  const endAabb = collider.computeAabb(end);

  return {
    min: {
      x: Math.min(startAabb.min.x, endAabb.min.x),
      y: Math.min(startAabb.min.y, endAabb.min.y),
    },
    max: {
      x: Math.max(startAabb.max.x, endAabb.max.x),
      y: Math.max(startAabb.max.y, endAabb.max.y),
    },
  };
}
