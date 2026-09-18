import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { addAabbComponent } from '../components/aabb-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { CollisionPair } from '../types/collision-pair.js';

const fixedDeltaMilliseconds = 1000 / 60;

/**
 * A long run of closely-spaced points whose height only wobbles by a tiny,
 * pseudo-random amount around a flat baseline - dense and shallow enough
 * that a wide resting body's contact spans many (5-7+) segments at once,
 * every one of them computing near-identical (but not perfectly
 * symmetric/tied) depths. This is the "wheel resting across several
 * terrain segments of near-identical depth" shape from the bug report:
 * with no dominant deepest segment, which one comes out on top is decided
 * by sub-pixel floating-point noise, and used to flip from tick to tick
 * even while the body was visibly at rest (see DEPTH_TIE_TOLERANCE in
 * detect-circle-terrain-collision.ts), breaking warm-starting and causing
 * steady-state sinking under load.
 */
function denseNoisyTerrainPoints(
  halfSpanCount: number,
  spacing: number,
  maxJitter: number,
): Vector2[] {
  const random = new Random('terrain-resting-contact');
  const points: Vector2[] = [];

  for (let i = -halfSpanCount; i <= halfSpanCount; i++) {
    points.push({
      x: i * spacing,
      y: random.randomFloat(-maxJitter, maxJitter),
    });
  }

  return points;
}

describe('resting contact stability on a multi-segment TerrainCollider', () => {
  let world: EcsWorld;
  let time: Time;
  let collisionPairs: CollisionPair[];
  let collisionManifolds: CollisionManifold[];
  let contactConstraints: ContactConstraint[];

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    collisionPairs = [];
    collisionManifolds = [];
    contactConstraints = [];

    world.addSystem(createGravityEcsSystem(time));
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
    world.addSystem(
      createCollisionResolutionEcsSystem(
        collisionManifolds,
        contactConstraints,
        time,
      ),
    );
    world.addSystem(createEulerIntegrationEcsSystem(time));
  });

  function addTerrainEntity(): number {
    const entity = world.createEntity();

    // Rotated 180 degrees: `TerrainCollider` always extends its solid slab
    // in the +y direction from its surface points (in its own local space),
    // but this test's gravity (the engine default) pulls bodies toward -y,
    // so the terrain is flipped to face the right way - the same convention
    // documented in documentation-site/docs/docs/physics/terrain.md and used
    // by the Rolling Ball demo.
    addPositionComponent(world, entity, { world: { x: 0, y: 0 } });
    addRotationComponent(world, entity, { world: Math.PI });
    addColliderComponent(world, entity, {
      collider: new TerrainCollider(
        denseNoisyTerrainPoints(40, 0.3, 0.0008),
        50,
      ),
      friction: 0.8,
    });
    addAabbComponent(world, entity);

    return entity;
  }

  function addHeavyCircleEntity(
    startX: number,
    startY: number,
    radius: number,
  ): { entity: number; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();
    const mass = 300;

    addPositionComponent(world, entity, { world: { x: startX, y: startY } });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
      friction: 0.8,
      restitution: 0,
    });
    addAabbComponent(world, entity);

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass,
      momentOfInertia: (mass * radius * radius) / 2,
    });

    const gravity = addGravityComponent(world, entity);

    expect(gravity.amount.y).toBeLessThan(0);

    return { entity, rigidBody };
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  it('settles to a bounded penetration depth without runaway sinking under load', () => {
    const radius = 2.5;

    addTerrainEntity();
    addHeavyCircleEntity(0, radius + 0.05, radius);

    const settledDepths: number[] = [];

    for (let i = 0; i < 90; i++) {
      tick();

      if (i >= 60 && collisionManifolds.length > 0) {
        settledDepths.push(collisionManifolds[0].depth);
      }
    }

    expect(settledDepths.length).toBeGreaterThan(0);

    for (const depth of settledDepths) {
      // The soft contact constraint's `slop` (0.002, the default) is the
      // amount of penetration the solver intentionally tolerates without
      // correcting it. A resting contact that warm-starts correctly settles
      // within a small multiple of that; the reported bug let it grow far
      // beyond it as every feature-id flip reset the accumulated impulse
      // back to zero.
      expect(depth).toBeLessThan(0.05);
    }
  });

  it('does not repeatedly flip the winning terrain segment once the body has settled', () => {
    const radius = 2.5;

    addTerrainEntity();
    addHeavyCircleEntity(0, radius + 0.05, radius);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    let featureIdChanges = 0;
    let previousFeatureId: number | null = null;

    for (let i = 0; i < 30; i++) {
      tick();

      expect(collisionManifolds.length).toBeGreaterThan(0);

      const featureId = collisionManifolds[0].featureIds[0];

      if (previousFeatureId !== null && featureId !== previousFeatureId) {
        featureIdChanges++;
      }

      previousFeatureId = featureId;
    }

    // A body that has already settled may still legitimately cross from one
    // segment to its neighbor once in a while as it micro-drifts, but the
    // reported bug flipped the winning segment on essentially every tick
    // (a warm-start miss every time), never settling. Tolerate the
    // occasional genuine crossing while catching that runaway chatter.
    expect(featureIdChanges).toBeLessThan(5);
  });
});
