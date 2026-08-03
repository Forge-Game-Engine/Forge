import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearDamperEcsSystem } from './linear-damper-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { createVector2 } from '../../math/index.js';
import { addLinearDamperComponent } from '../components/linear-damper-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';

describe('createLinearDamperEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    world.addSystem(createLinearDamperEcsSystem(time));
  });

  function createBody(
    x: number,
    velocityX: number,
  ): { entity: number; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();
    addPositionComponent(world, entity, {
      world: createVector2(x, 0),
      local: createVector2(x, 0),
    });
    addRotationComponent(world, entity);
    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      velocity: createVector2(velocityX, 0),
    });

    return { entity, rigidBody };
  }

  it('opposes closing velocity between two anchors', () => {
    const a = createBody(0, 1);
    const b = createBody(5, -1);

    addLinearDamperComponent(world, world.createEntity(), {
      entityA: a.entity,
      entityB: b.entity,
      dampingCoefficient: 2,
    });

    world.update();

    expect(a.rigidBody.velocity.x).toBeLessThan(1);
    expect(b.rigidBody.velocity.x).toBeGreaterThan(-1);
  });

  it('applies no force when there is no relative velocity', () => {
    const a = createBody(0, 0);
    const b = createBody(5, 0);

    addLinearDamperComponent(world, world.createEntity(), {
      entityA: a.entity,
      entityB: b.entity,
      dampingCoefficient: 2,
    });

    world.update();

    expect(a.rigidBody.velocity.x).toBe(0);
    expect(b.rigidBody.velocity.x).toBe(0);
  });

  it('scales the impulse linearly with dampingCoefficient', () => {
    const a1 = createBody(0, 0);
    const b1 = createBody(5, -2);
    addLinearDamperComponent(world, world.createEntity(), {
      entityA: a1.entity,
      entityB: b1.entity,
      dampingCoefficient: 1,
    });

    const a2 = createBody(0, 0);
    const b2 = createBody(5, -2);
    addLinearDamperComponent(world, world.createEntity(), {
      entityA: a2.entity,
      entityB: b2.entity,
      dampingCoefficient: 2,
    });

    world.update();

    const delta1 = b1.rigidBody.velocity.x - -2;
    const delta2 = b2.rigidBody.velocity.x - -2;

    expect(delta2).toBeCloseTo(delta1 * 2, 5);
  });
});
