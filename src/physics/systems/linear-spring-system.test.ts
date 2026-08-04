import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearSpringEcsSystem } from './linear-spring-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';

import { addLinearSpringComponent } from '../components/linear-spring-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';

describe('createLinearSpringEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    world.addSystem(createLinearSpringEcsSystem(time));
  });

  function createBody(x: number): {
    entity: number;
    rigidBody: RigidBodyEcsComponent;
  } {
    const entity = world.createEntity();
    addPositionComponent(world, entity, {
      world: { x, y: 0 },
      local: { x, y: 0 },
    });
    addRotationComponent(world, entity);
    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
    });

    return { entity, rigidBody };
  }

  it('pulls two bodies together when stretched beyond restLength', () => {
    const a = createBody(0);
    const b = createBody(5);

    addLinearSpringComponent(world, world.createEntity(), {
      entityA: a.entity,
      entityB: b.entity,
      restLength: 2,
      stiffness: 10,
    });

    world.update();

    expect(a.rigidBody.velocity.x).toBeGreaterThan(0);
    expect(b.rigidBody.velocity.x).toBeLessThan(0);
  });

  it('scales force linearly with stiffness and displacement', () => {
    const a1 = createBody(0);
    const b1 = createBody(4);
    addLinearSpringComponent(world, world.createEntity(), {
      entityA: a1.entity,
      entityB: b1.entity,
      restLength: 2,
      stiffness: 5,
    });

    const a2 = createBody(0);
    const b2 = createBody(4);
    addLinearSpringComponent(world, world.createEntity(), {
      entityA: a2.entity,
      entityB: b2.entity,
      restLength: 2,
      stiffness: 10,
    });

    world.update();

    const impulse1 = b1.rigidBody.velocity.x;
    const impulse2 = b2.rigidBody.velocity.x;

    expect(impulse2).toBeCloseTo(impulse1 * 2, 5);
  });

  it('applies no force at restLength', () => {
    const a = createBody(0);
    const b = createBody(2);

    addLinearSpringComponent(world, world.createEntity(), {
      entityA: a.entity,
      entityB: b.entity,
      restLength: 2,
      stiffness: 10,
    });

    world.update();

    expect(a.rigidBody.velocity.x).toBe(0);
    expect(b.rigidBody.velocity.x).toBe(0);
  });
});
