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
import { CircleCollider } from '../colliders/circle-collider.js';
import { addColliderComponent } from '../components/collider-component.js';

/**
 * A circle with a mass and moment of inertia of 1, for a dynamic body to
 * take its mass data from. Its mask of `0` keeps it out of collisions.
 */
function addUnitMassCollider(world: EcsWorld, entity: number): void {
  addColliderComponent(world, entity, {
    collider: new CircleCollider(Math.SQRT2, 1 / (2 * Math.PI)),
    mask: 0,
  });
}

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
      local: { x, y: 0 },
    });
    addRotationComponent(world, entity);
    addUnitMassCollider(world, entity);
    const rigidBody = addRigidBodyComponent(world, entity);

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
