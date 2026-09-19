import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
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
 * The terrain entity is rotated 180 degrees throughout this file:
 * `TerrainCollider` always extends its solid slab in the +y direction from
 * its surface points (in its own local space), but these tests' gravity (the
 * engine default) pulls bodies toward -y, so the terrain is flipped to face
 * the right way - the same convention documented in
 * documentation-site/docs/docs/physics/terrain.md and used by the Rolling
 * Ball demo. With the terrain flipped, a contact normal pointing from the
 * body toward the terrain points broadly *down* in world space.
 */
const terrainRotation = Math.PI;

/**
 * A long run of closely-spaced points whose height only wobbles by a tiny,
 * pseudo-random amount around a flat baseline - dense and shallow enough
 * that a wide resting body's contact spans many (5-7+) surface edges at
 * once, every one of them nearly coplanar with its neighbors. This is the
 * "wheel resting across several terrain segments" shape from the bug
 * report: with the terrain closed off into one quadrilateral per pair of
 * points, a body this wide reached right past the ground it was on into the
 * interior boundaries between those quadrilaterals.
 */
function denseNoisyTerrainPoints(
  halfSpanCount: number,
  spacing: number,
  maxJitter: number,
): Vector2[] {
  const random = new Random('terrain-contact-stability');
  const points: Vector2[] = [];

  for (let i = -halfSpanCount; i <= halfSpanCount; i++) {
    points.push({
      x: i * spacing,
      y: random.randomFloat(-maxJitter, maxJitter),
    });
  }

  return points;
}

/**
 * The direction the terrain pushes the body it is in contact with. A
 * manifold's normal points from its `entityA` toward its `entityB`, so it
 * already is that direction when the terrain is `entityA`, and its opposite
 * otherwise.
 */
function terrainPushDirection(
  manifold: CollisionManifold,
  terrainEntity: number,
): Vector2 {
  const { normal } = manifold;

  return manifold.entityA === terrainEntity
    ? normal
    : { x: -normal.x, y: -normal.y };
}

/**
 * How far the direction the terrain pushes a body tilts away from straight
 * up in world space - which, for the near-flat terrain these tests use, is
 * the only direction it should ever push in.
 */
function tiltFromVertical(
  manifold: CollisionManifold,
  terrainEntity: number,
): number {
  const push = terrainPushDirection(manifold, terrainEntity);

  return Math.abs(Math.atan2(push.x, push.y));
}

describe('contact stability on a multi-edge TerrainCollider', () => {
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

    addPositionComponent(world, entity, { world: { x: 0, y: 0 } });
    addRotationComponent(world, entity, { world: terrainRotation });
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

  function addHeavyBody(
    collider: CircleCollider | PolygonCollider,
    startX: number,
    startY: number,
    momentOfInertia: number,
  ): { entity: number; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: { x: startX, y: startY },
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider,
      friction: 0.8,
      restitution: 0,
    });
    addAabbComponent(world, entity);

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 300,
      momentOfInertia,
    });

    const gravity = addGravityComponent(world, entity);

    expect(gravity.amount.y).toBeLessThan(0);

    return { entity, rigidBody };
  }

  function addHeavyCircleEntity(
    startX: number,
    startY: number,
    radius: number,
  ) {
    return addHeavyBody(
      new CircleCollider(radius),
      startX,
      startY,
      (300 * radius * radius) / 2,
    );
  }

  function addHeavyBoxEntity(
    startX: number,
    startY: number,
    width: number,
    height: number,
  ) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return addHeavyBody(
      new PolygonCollider([
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
      ]),
      startX,
      startY,
      (300 * (width * width + height * height)) / 12,
    );
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  function featureIdsThisTick(): Set<number> {
    const featureIds = new Set<number>();

    for (const manifold of collisionManifolds) {
      for (const featureId of manifold.featureIds) {
        featureIds.add(featureId);
      }
    }

    return featureIds;
  }

  it('settles a heavy circle to a bounded penetration depth without runaway sinking under load', () => {
    const radius = 2.5;

    addTerrainEntity();
    addHeavyCircleEntity(0, radius + 0.05, radius);

    const settledDepths: number[] = [];

    for (let i = 0; i < 90; i++) {
      tick();

      if (i >= 60 && collisionManifolds.length > 0) {
        settledDepths.push(
          Math.max(...collisionManifolds.map((manifold) => manifold.depth)),
        );
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

  it('settles a heavy box spanning many surface edges to a bounded penetration depth', () => {
    addTerrainEntity();
    addHeavyBoxEntity(0, 1.05, 4, 2);

    const settledDepths: number[] = [];

    for (let i = 0; i < 90; i++) {
      tick();

      if (i >= 60) {
        expect(collisionManifolds.length).toBeGreaterThan(1);
        settledDepths.push(
          Math.max(...collisionManifolds.map((manifold) => manifold.depth)),
        );
      }
    }

    for (const depth of settledDepths) {
      expect(depth).toBeLessThan(0.05);
    }
  });

  it('keeps a settled circle on exactly the same contact features tick after tick', () => {
    const radius = 2.5;

    addTerrainEntity();
    addHeavyCircleEntity(0, radius + 0.05, radius);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    let previousFeatureIds: Set<number> | null = null;

    for (let i = 0; i < 30; i++) {
      tick();

      expect(collisionManifolds.length).toBeGreaterThan(0);

      const featureIds = featureIdsThisTick();

      if (previousFeatureIds !== null) {
        // Which surface features a settled body touches is decided by the
        // geometry, not by comparing near-tied penetration depths across
        // the edges it spans, so nothing about it can change while it is
        // not moving. The reported bug changed the answer on essentially
        // every tick - a warm-start miss every time - and never settled.
        expect([...featureIds]).toEqual([...previousFeatureIds]);
      }

      previousFeatureIds = featureIds;
    }
  });

  it('never pushes a settled body sideways along the ground it is resting on', () => {
    // The terrain is flat to within a thousandth of a unit over a span of
    // 24, so every contact on it must push almost exactly straight up. A
    // contact against an interior boundary between two neighboring
    // stretches of ground - which is what the old quadrilateral-per-segment
    // decomposition exposed to a body this wide - would push sideways
    // instead.
    const terrainEntity = addTerrainEntity();
    addHeavyCircleEntity(0, 2.55, 2.5);
    addHeavyBoxEntity(8, 1.05, 4, 2);

    let checkedContacts = 0;

    for (let i = 0; i < 90; i++) {
      tick();

      for (const manifold of collisionManifolds) {
        checkedContacts++;
        expect(tiltFromVertical(manifold, terrainEntity)).toBeLessThan(0.02);
        expect(terrainPushDirection(manifold, terrainEntity).y).toBeGreaterThan(
          0,
        );
      }
    }

    expect(checkedContacts).toBeGreaterThan(90);
  });

  it('carries a rolling circle across many surface edges without losing its contact', () => {
    const radius = 2.5;

    const terrainEntity = addTerrainEntity();
    const { rigidBody } = addHeavyCircleEntity(-6, radius + 0.05, radius);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    let tickedWithoutContact = 0;

    for (let i = 0; i < 240; i++) {
      // Re-applied every tick so friction against the ground doesn't bring
      // the roll to a stop partway across.
      rigidBody.velocity.x = 3;
      tick();

      if (collisionManifolds.length === 0) {
        tickedWithoutContact++;
      }

      for (const manifold of collisionManifolds) {
        expect(tiltFromVertical(manifold, terrainEntity)).toBeLessThan(0.02);
        expect(manifold.depth).toBeLessThan(0.05);
      }
    }

    expect(tickedWithoutContact).toBe(0);
  });

  it('carries most of a rolling box’s contacts from one tick to the next', () => {
    addTerrainEntity();
    const { rigidBody } = addHeavyBoxEntity(-6, 1.05, 4, 2);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    let carried = 0;
    let total = 0;
    let previousFeatureIds = featureIdsThisTick();

    for (let i = 0; i < 240; i++) {
      rigidBody.velocity.x = 3;
      tick();

      const featureIds = featureIdsThisTick();

      expect(featureIds.size).toBeGreaterThan(1);

      for (const featureId of featureIds) {
        total++;

        if (previousFeatureIds.has(featureId)) {
          carried++;
        }
      }

      previousFeatureIds = featureIds;
    }

    // A sliding body legitimately picks up a new surface edge at its
    // leading end and drops one at its trailing end, but everything in
    // between keeps its own contact - and with it the accumulated impulse
    // the solver warm-starts from. Under the old single-winning-segment
    // model the one contact that existed was replaced outright each time
    // the winner changed hands.
    expect(carried / total).toBeGreaterThan(0.9);
  });
});
