import { beforeEach, describe, expect, it } from 'vitest';
import { applyExplosiveForce } from './apply-explosive-force.js';
import { addPositionComponent } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vector2 } from '../math/index.js';
import { addRigidBodyComponent, rigidBodyId } from './components/index.js';

describe('applyExplosiveForce', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(position: Vector2): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: position.clone(),
      local: position.clone(),
    });
    addRigidBodyComponent(world, entity, { mass: 1, momentOfInertia: 1 });

    return entity;
  }

  it('applies an impulse directly away from the center, strongest closest to it', () => {
    const near = createBody(new Vector2(50, 0));
    const far = createBody(new Vector2(150, 0));

    applyExplosiveForce(world, Vector2.zero, 1000, 200);

    const nearRigidBody = world.getComponent(near, rigidBodyId)!;
    const farRigidBody = world.getComponent(far, rigidBodyId)!;

    expect(nearRigidBody.velocity.x).toBeGreaterThan(0);
    expect(nearRigidBody.velocity.y).toBeCloseTo(0);
    expect(nearRigidBody.velocity.x).toBeGreaterThan(farRigidBody.velocity.x);
  });

  it('does not affect bodies at or beyond the radius', () => {
    const outside = createBody(new Vector2(200, 0));

    applyExplosiveForce(world, Vector2.zero, 1000, 200);

    const rigidBody = world.getComponent(outside, rigidBodyId)!;

    expect(rigidBody.velocity.x).toBe(0);
    expect(rigidBody.velocity.y).toBe(0);
  });

  it('does not affect static bodies (no RigidBodyEcsComponent)', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: new Vector2(50, 0),
      local: new Vector2(50, 0),
    });

    expect(() =>
      applyExplosiveForce(world, Vector2.zero, 1000, 200),
    ).not.toThrow();
  });
});
