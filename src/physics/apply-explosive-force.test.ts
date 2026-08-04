import { beforeEach, describe, expect, it } from 'vitest';
import { applyExplosiveForce } from './apply-explosive-force.js';
import { addPositionComponent } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vec2, Vector2 } from '../math/index.js';
import { addRigidBodyComponent, rigidBodyId } from './components/index.js';

describe('applyExplosiveForce', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(position: Vector2): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: Vec2.clone(position),
      local: Vec2.clone(position),
    });
    addRigidBodyComponent(world, entity, { mass: 1, momentOfInertia: 1 });

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

  it('does not affect bodies at or beyond the radius', () => {
    const outside = createBody({ x: 200, y: 0 });

    applyExplosiveForce(world, Vec2.zero, 1000, 200);

    const rigidBody = world.getComponent(outside, rigidBodyId)!;

    expect(rigidBody.velocity.x).toBe(0);
    expect(rigidBody.velocity.y).toBe(0);
  });

  it('does not affect static bodies (no RigidBodyEcsComponent)', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: { x: 50, y: 0 },
      local: { x: 50, y: 0 },
    });

    expect(() =>
      applyExplosiveForce(world, Vec2.zero, 1000, 200),
    ).not.toThrow();
  });
});
