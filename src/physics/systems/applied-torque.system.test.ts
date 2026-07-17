import { beforeEach, describe, expect, it } from 'vitest';
import { createAppliedTorqueEcsSystem } from './applied-torque.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import {
  AppliedTorqueEcsComponent,
  AppliedTorqueId,
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '../components/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('AppliedTorqueSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createAppliedTorqueEcsSystem(time));
  });

  it('should apply the torque to the physics body scaled by delta time', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AppliedTorqueEcsComponent>(entity, AppliedTorqueId, {
      value: 10,
    });

    time.update(500);
    world.update();

    expect(physicsBody.angularVelocity).toBeCloseTo(
      10 * physicsBody.inverseInertia * 0.5,
    );
  });

  it('should reset the applied torque value to 0 after applying it', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    const torqueComponent = world.addComponent<AppliedTorqueEcsComponent>(
      entity,
      AppliedTorqueId,
      { value: 10 },
    );

    time.update(500);
    world.update();

    expect(torqueComponent.value).toBe(0);
  });

  it('should not apply torque again on the next tick unless value is set again', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(1) });

    world.addComponent<PhysicsBodyEcsComponent>(entity, PhysicsBodyId, {
      physicsBody,
    });
    world.addComponent<AppliedTorqueEcsComponent>(entity, AppliedTorqueId, {
      value: 10,
    });

    time.update(500);
    world.update();

    const angularVelocityAfterFirstTick = physicsBody.angularVelocity;

    time.update(1000);
    world.update();

    expect(physicsBody.angularVelocity).toBe(angularVelocityAfterFirstTick);
  });
});
