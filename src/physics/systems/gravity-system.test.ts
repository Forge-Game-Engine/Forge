import { beforeEach, describe, expect, it } from 'vitest';
import { createGravityEcsSystem } from './gravity-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyType,
} from '../components/rigidbody-component.js';

describe('createGravityEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    world.addSystem(createGravityEcsSystem(time));
  });

  function createBody(type: RigidBodyType) {
    const entity = world.createEntity();

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      type,
    });
    addGravityComponent(world, entity, { amount: { x: 0, y: -10 } });

    return rigidBody;
  }

  it('accelerates a dynamic body downward', () => {
    const rigidBody = createBody('dynamic');

    world.update();

    expect(rigidBody.velocity.y).toBeLessThan(0);
  });

  it.each(['static', 'kinematic'] as const)(
    'does not accelerate a %s body',
    (type) => {
      const rigidBody = createBody(type);

      world.update();

      expect(rigidBody.velocity).toEqual({ x: 0, y: 0 });
    },
  );
});
