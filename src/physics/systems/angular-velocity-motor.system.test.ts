import { beforeEach, describe, expect, it } from 'vitest';
import { createAngularVelocityMotorEcsSystem } from './angular-velocity-motor.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import {
  AngularVelocityMotorEcsComponent,
  AngularVelocityMotorId,
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '../components/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('AngularVelocityMotorSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createAngularVelocityMotorEcsSystem(time));
  });

  it('should drive angular velocity to the target when the required torque is within maxTorque', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AngularVelocityMotorEcsComponent>(
      entity,
      AngularVelocityMotorId,
      { targetVelocity: 5, maxTorque: 1_000_000 },
    );

    time.update(500);
    world.update();

    expect(physicsBody.angularVelocity).toBeCloseTo(5);
  });

  it('should clamp the applied torque to maxTorque, approaching the target gradually', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });
    const maxTorque = 0.01;

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AngularVelocityMotorEcsComponent>(
      entity,
      AngularVelocityMotorId,
      { targetVelocity: 1000, maxTorque },
    );

    time.update(500);
    world.update();

    const expectedAngularVelocity =
      maxTorque * physicsBody.inverseInertia * 0.5;

    expect(physicsBody.angularVelocity).toBeCloseTo(expectedAngularVelocity);
    expect(physicsBody.angularVelocity).toBeLessThan(1000);
  });

  it('should apply negative torque to slow an overshooting body towards the target', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });

    physicsBody.angularVelocity = 10;

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AngularVelocityMotorEcsComponent>(
      entity,
      AngularVelocityMotorId,
      { targetVelocity: 0, maxTorque: 1_000_000 },
    );

    time.update(500);
    world.update();

    expect(physicsBody.angularVelocity).toBeCloseTo(0);
  });

  it('should not apply torque to static bodies', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({
      shape: new CircleShape(1),
      isStatic: true,
    });

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AngularVelocityMotorEcsComponent>(
      entity,
      AngularVelocityMotorId,
      { targetVelocity: 5, maxTorque: 1_000_000 },
    );

    time.update(500);
    world.update();

    expect(physicsBody.angularVelocity).toBe(0);
  });
});
