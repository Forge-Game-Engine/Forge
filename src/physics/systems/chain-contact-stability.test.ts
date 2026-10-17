import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

const fixedDeltaMilliseconds = 1000 / 60;

/**
 * A room in one `ChainCollider`: an outer solid loop with the room as a
 * hole inside it, a floating platform, and a thin floating wall. The
 * room's floor, at `y = 0`, is split into forty collinear edges a unit
 * long, so a body sliding along it crosses an edge joint every unit.
 */
function createRoom(): ChainCollider {
  const floor: Vector2[] = [];

  for (let x = -20; x <= 20; x++) {
    floor.push({ x, y: 0 });
  }

  return new ChainCollider([
    // Solid around the room: positive signed area.
    [
      { x: -30, y: -30 },
      { x: 30, y: -30 },
      { x: 30, y: 10 },
      { x: -30, y: 10 },
    ],
    // The room, a hole in that solid: negative signed area. The floor runs
    // left to right, then the right wall up, the ceiling right to left and
    // the left wall down.
    [...floor, { x: 20, y: -20 }, { x: -20, y: -20 }],
    // A platform: positive signed area.
    [
      { x: -5, y: -8 },
      { x: 5, y: -8 },
      { x: 5, y: -7 },
      { x: -5, y: -7 },
    ],
    // A thin wall, a fifth of a unit thick.
    [
      { x: 10, y: -15 },
      { x: 10.2, y: -15 },
      { x: 10.2, y: -3 },
      { x: 10, y: -3 },
    ],
  ]);
}

/**
 * The direction the chain pushes the body it is in contact with. A
 * manifold's normal points from its `entityA` toward its `entityB`.
 */
function chainPushDirection(
  manifold: CollisionManifold,
  chainEntity: number,
): Vector2 {
  const { normal } = manifold;

  return manifold.entityA === chainEntity
    ? normal
    : { x: -normal.x, y: -normal.y };
}

describe('contact stability on a ChainCollider room', () => {
  let world: EcsWorld;
  let time: Time;
  let collisionPairs: CollisionPair[];
  let collisionManifolds: CollisionManifold[];
  let contactConstraints: ContactConstraint[];
  let chainEntity: number;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    collisionPairs = [];
    collisionManifolds = [];
    contactConstraints = [];

    world.addSystem(createTransformEcsSystem());
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
    world.addSystem(createContinuousCollisionEcsSystem());

    chainEntity = world.createEntity();
    addPositionComponent(world, chainEntity);
    addColliderComponent(world, chainEntity, {
      collider: createRoom(),
      friction: 0,
      restitution: 0,
    });
  });

  function addBody(
    collider: CircleCollider | PolygonCollider,
    start: Vector2,
    withGravity = true,
  ): { position: PositionEcsComponent; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, { local: start });

    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider,
      friction: 0,
      restitution: 0,
    });

    const rigidBody = addRigidBodyComponent(world, entity);

    if (withGravity) {
      addGravityComponent(world, entity);
    }

    return { position, rigidBody };
  }

  function box(width: number, height: number): PolygonCollider {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return new PolygonCollider([
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ]);
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  it.each([
    ['box', (): PolygonCollider => box(2, 1), 0.5],
    ['circle', (): CircleCollider => new CircleCollider(0.5), 0.5],
  ] as const)(
    'keeps a frictionless %s sliding across the floor’s edge joints at its speed',
    (_name, createCollider, halfHeight) => {
      const { position, rigidBody } = addBody(createCollider(), {
        x: -15,
        y: -halfHeight,
      });

      // Let it settle onto the floor first.
      for (let i = 0; i < 30; i++) {
        tick();
      }

      let checkedContacts = 0;

      for (let i = 0; i < 120; i++) {
        if (i === 0) {
          rigidBody.velocity.x = 5;
        }

        tick();

        for (const manifold of collisionManifolds) {
          const push = chainPushDirection(manifold, chainEntity);

          checkedContacts++;
          expect(Math.abs(push.x)).toBeLessThan(1e-6);
          expect(push.y).toBeLessThan(0);
        }
      }

      // Two seconds at 5 units a second carries it across ten edge joints,
      // in contact with the floor every tick.
      expect(checkedContacts).toBeGreaterThanOrEqual(120);
      expect(rigidBody.velocity.x).toBeCloseTo(5, 6);
      expect(position.world.x).toBeGreaterThan(-5.5);
      expect(position.world.y).toBeCloseTo(-halfHeight, 1);
    },
  );

  it('rests a box in a concave corner with a contact from each wall', () => {
    const { position, rigidBody } = addBody(box(2, 2), { x: 18.5, y: -1 });

    for (let i = 0; i < 90; i++) {
      rigidBody.velocity.x = Math.max(rigidBody.velocity.x, 1);
      tick();
    }

    const pushes = collisionManifolds.map((manifold) =>
      chainPushDirection(manifold, chainEntity),
    );

    expect(pushes.some((push) => push.y < -0.99)).toBe(true);
    expect(pushes.some((push) => push.x < -0.99)).toBe(true);
    expect(position.world.x).toBeCloseTo(19, 1);
    expect(position.world.y).toBeCloseTo(-1, 1);
  });

  it('rests a box on a platform', () => {
    const { position } = addBody(box(2, 1), { x: 0, y: -9 });

    for (let i = 0; i < 90; i++) {
      tick();
    }

    expect(position.world.y).toBeCloseTo(-8.5, 1);
    expect(collisionManifolds.length).toBeGreaterThan(0);
  });

  it('stops a fast ball at the near face of a thin wall', () => {
    const radius = 0.25;
    const { position, rigidBody } = addBody(
      new CircleCollider(radius),
      { x: 5, y: -9 },
      false,
    );

    // 500 units a second is over 8 units a tick, forty times the wall's
    // thickness, so without the sweep the ball would pass straight through
    // it in one tick.
    rigidBody.velocity.x = 500;

    for (let i = 0; i < 10; i++) {
      tick();

      expect(position.local.x).toBeLessThan(10);
      expect(position.local.x).toBeGreaterThan(9);
    }

    expect(Math.abs(rigidBody.velocity.x)).toBeLessThan(5);
  });
});
