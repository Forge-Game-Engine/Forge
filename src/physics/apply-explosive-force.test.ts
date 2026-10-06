import { beforeEach, describe, expect, it } from 'vitest';
import { applyExplosiveForce } from './apply-explosive-force.js';
import { addPositionComponent } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vec2, Vector2 } from '../math/index.js';
import { CircleCollider } from './colliders/index.js';
import {
  addColliderComponent,
  addRigidBodyComponent,
  rigidBodyId,
} from './components/index.js';

describe('applyExplosiveForce', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(position: Vector2, center: Vector2 = Vec2.zero): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: Vec2.clone(position),
    });
    addColliderComponent(world, entity, {
      collider: new CircleCollider(1, 1, center),
    });
    addRigidBodyComponent(world, entity);

    return entity;
  }

  it('applies an impulse directly away from the center, strongest closest to it', () => {
    const near = createBody({ x: 50, y: 0 });
    const far = createBody({ x: 150, y: 0 });

    applyExplosiveForce(world, Vec2.zero, 1000, 200);

    const nearRigidBody = world.getComponent(near, rigidBodyId)!;
    const farRigidBody = world.getComponent(far, rigidBodyId)!;

    expect(nearRigidBody.velocity.x).toBeGreaterThan(0);
    expect(nearRigidBody.velocity.y).toBeCloseTo(0);
    expect(nearRigidBody.velocity.x).toBeGreaterThan(farRigidBody.velocity.x);
  });

  it('pushes a body at the exact center upwards', () => {
    const centered = createBody(Vec2.zero);

    applyExplosiveForce(world, Vec2.zero, 1000, 200);

    const rigidBody = world.getComponent(centered, rigidBodyId)!;

    expect(rigidBody.velocity.x).toBeCloseTo(0);
    expect(rigidBody.velocity.y).toBeGreaterThan(0);
  });

  it('does not affect bodies at or beyond the radius', () => {
    const outside = createBody({ x: 200, y: 0 });

    applyExplosiveForce(world, Vec2.zero, 1000, 200);

    const rigidBody = world.getComponent(outside, rigidBodyId)!;

    expect(rigidBody.velocity.x).toBe(0);
    expect(rigidBody.velocity.y).toBe(0);
  });

  it('measures from the center of mass and imparts no spin', () => {
    // The origin is outside the radius, but the center of mass is inside,
    // directly above the explosion.
    const entity = createBody({ x: 0, y: 250 }, { x: 0, y: -100 });

    applyExplosiveForce(world, Vec2.zero, 1000, 200);

    const rigidBody = world.getComponent(entity, rigidBodyId)!;

    expect(rigidBody.velocity.x).toBeCloseTo(0);
    expect(rigidBody.velocity.y).toBeGreaterThan(0);
    expect(rigidBody.angularVelocity).toBe(0);
  });

  it('does not affect static bodies (no RigidBodyEcsComponent)', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: { x: 50, y: 0 },
    });

    expect(() =>
      applyExplosiveForce(world, Vec2.zero, 1000, 200),
    ).not.toThrow();
  });
});
