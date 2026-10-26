import { beforeEach, describe, expect, it } from 'vitest';
import { addPositionComponent, addRotationComponent } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { CircleCollider } from './colliders/circle-collider.js';
import {
  addColliderComponent,
  colliderId,
} from './components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from './components/rigidbody-component.js';
import { findSleepingManifolds } from './find-sleeping-manifolds.js';
import { CollisionManifold } from './types/collision-manifold.js';

describe('findSleepingManifolds', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createSleepingBody(): {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
  } {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    return {
      entity,
      rigidBody: addRigidBodyComponent(world, entity, { isSleeping: true }),
    };
  }

  function createManifold(entityA: number, entityB: number): CollisionManifold {
    const collider = new CircleCollider(1);

    return {
      entityA,
      entityB,
      colliderA: collider,
      colliderB: collider,
      normal: { x: 0, y: 1 },
      depth: 0.1,
      contactPoints: [],
      featureIds: [],
    };
  }

  /** Gives `body` a sleep record matching its current state. */
  function recordManifolds(
    body: { entity: number; rigidBody: RigidBodyEcsComponent },
    manifolds: CollisionManifold[],
  ): void {
    body.rigidBody.sleepRecord = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider: world.getComponentRequired(body.entity, colliderId).collider,
      gravity: null,
      partners: [],
      links: [],
      manifolds,
    };
  }

  it('returns the manifolds entityA recorded for the pair', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();
    const manifold = createManifold(a.entity, b.entity);

    recordManifolds(a, [manifold]);
    recordManifolds(b, []);

    expect(findSleepingManifolds(world, a.entity, b.entity)).toEqual([
      manifold,
    ]);
  });

  it('returns the manifolds entityB recorded when entityA recorded none', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();
    const manifold = createManifold(a.entity, b.entity);

    recordManifolds(a, []);
    recordManifolds(b, [manifold]);

    expect(findSleepingManifolds(world, a.entity, b.entity)).toEqual([
      manifold,
    ]);
  });

  it('only returns manifolds listing the pair in the same order', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();

    recordManifolds(a, [createManifold(b.entity, a.entity)]);
    recordManifolds(b, [createManifold(b.entity, a.entity)]);

    expect(findSleepingManifolds(world, a.entity, b.entity)).toBeNull();
  });

  it('returns null when the records have no manifolds for the pair', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();
    const other = createSleepingBody();

    recordManifolds(a, [createManifold(a.entity, other.entity)]);
    recordManifolds(b, []);

    expect(findSleepingManifolds(world, a.entity, b.entity)).toBeNull();
  });

  it('returns null when neither body has a sleep record', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();

    expect(findSleepingManifolds(world, a.entity, b.entity)).toBeNull();
  });

  it('returns null when one side is awake', () => {
    const a = createSleepingBody();
    const b = createSleepingBody();

    recordManifolds(a, [createManifold(a.entity, b.entity)]);
    recordManifolds(b, []);
    b.rigidBody.wakeRequested = true;

    expect(findSleepingManifolds(world, a.entity, b.entity)).toBeNull();
  });

  it('returns null for two entities without rigid bodies', () => {
    const a = world.createEntity();
    const b = world.createEntity();

    expect(findSleepingManifolds(world, a, b)).toBeNull();
  });
});
