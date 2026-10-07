import { beforeEach, describe, expect, it } from 'vitest';
import { createAngularVelocityMotorEcsSystem } from './angular-velocity-motor-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addAngularVelocityMotorComponent } from '../components/angular-velocity-motor-component.js';
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
    addUnitMassCollider(world, entity);
    const rigidBody = addRigidBodyComponent(world, entity, {
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
