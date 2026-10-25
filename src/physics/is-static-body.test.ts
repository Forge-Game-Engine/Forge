import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../ecs/index.js';
import { addRigidBodyComponent } from './components/rigidbody-component.js';
import { isStaticBody } from './is-static-body.js';

describe('isStaticBody', () => {
  it('should treat a collider with no rigid body as static', () => {
    expect(isStaticBody(null)).toBe(true);
  });

  it('should treat a static rigid body as static', () => {
    const world = new EcsWorld();
    const rigidBody = addRigidBodyComponent(world, world.createEntity(), {
      type: 'static',
    });

    expect(isStaticBody(rigidBody)).toBe(true);
  });

  it('should not treat kinematic or dynamic rigid bodies as static', () => {
    const world = new EcsWorld();
    const kinematic = addRigidBodyComponent(world, world.createEntity(), {
      type: 'kinematic',
    });
    const dynamic = addRigidBodyComponent(world, world.createEntity(), {
      type: 'dynamic',
    });

    expect(isStaticBody(kinematic)).toBe(false);
    expect(isStaticBody(dynamic)).toBe(false);
  });
});
