import { beforeEach, describe, expect, it } from 'vitest';
import { createAngularVelocityMotorEcsSystem } from './angular-velocity-motor-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addAngularVelocityMotorComponent } from '../components/angular-velocity-motor-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';

describe('createAngularVelocityMotorEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let currentMs: number;

  const dtMs = 1000 / 60;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    currentMs = 0;
    time.update(currentMs);

    world.addSystem(createAngularVelocityMotorEcsSystem(time));
  });

  function tick(): void {
    currentMs += dtMs;
    time.update(currentMs);
    world.update();
  }

  function createMotoredEntity(
    targetVelocity: number,
    maxTorque: number,
    rigidBodyOverrides: Partial<RigidBodyEcsComponent> = {},
  ): RigidBodyEcsComponent {
    const entity = world.createEntity();
    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      ...rigidBodyOverrides,
    });
    addAngularVelocityMotorComponent(world, entity, {
      targetVelocity,
      maxTorque,
    });

    return rigidBody;
  }

  it('reaches and holds targetVelocity given a generous maxTorque', () => {
    const rigidBody = createMotoredEntity(10, 1000);

    for (let i = 0; i < 30; i++) {
      tick();
    }

    expect(rigidBody.angularVelocity).toBeCloseTo(10, 3);

    tick();

    expect(rigidBody.angularVelocity).toBeCloseTo(10, 3);
  });

  it('bounds per-tick change by maxTorque and never overshoots the target', () => {
    const rigidBody = createMotoredEntity(10, 1);

    const maxChangePerTick = 1 * (1 / 60);

    tick();

    expect(rigidBody.angularVelocity).toBeCloseTo(maxChangePerTick, 5);
    expect(rigidBody.angularVelocity).toBeLessThanOrEqual(10);
  });

  it('recovers after an external disturbance', () => {
    const rigidBody = createMotoredEntity(5, 1000);

    for (let i = 0; i < 10; i++) {
      tick();
    }

    expect(rigidBody.angularVelocity).toBeCloseTo(5, 3);

    rigidBody.angularVelocity = -20;

    for (let i = 0; i < 10; i++) {
      tick();
    }

    expect(rigidBody.angularVelocity).toBeCloseTo(5, 3);
  });
});
