import { describe, expect, it } from 'vitest';
import { createPhysicsEcsSystem } from './physics.system.js';
import { createWheelMotorEcsSystem } from './wheel-motor.system.js';
import { positionId, rotationId, Time } from '../../common/index.js';
import { EcsWorld, SystemRegistrationOrder } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { PhysicsBodyId } from '../components/physics-body-component.js';
import { addWheelMotorComponent } from '../components/wheel-motor-component.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, PolygonShape } from '../shapes/index.js';

function createWheelEntity(
  world: EcsWorld,
  physicsWorld: PhysicsWorld,
  targetAngularVelocity: number,
  maxTorque: number,
): RigidBody {
  const entity = world.createEntity();
  const physicsBody = new RigidBody({ shape: new CircleShape(1), density: 1 });

  world.addComponent(entity, PhysicsBodyId, { physicsBody });
  world.addComponent(entity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });
  world.addComponent(entity, rotationId, { local: 0, world: 0 });
  addWheelMotorComponent(world, entity, { targetAngularVelocity, maxTorque });

  physicsWorld.addBody(physicsBody);

  return physicsBody;
}

describe('createWheelMotorEcsSystem', () => {
  describe('torque application', () => {
    it('should reach the target angular velocity within one tick when maxTorque is not limiting', () => {
      const world = new EcsWorld();
      const time = new Time();
      const physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });

      world.addSystem(
        createWheelMotorEcsSystem(time),
        SystemRegistrationOrder.early,
      );
      world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

      const wheel = createWheelEntity(world, physicsWorld, 10, 1000);

      time.update(1000);
      world.update();

      expect(wheel.angularVelocity).toBeCloseTo(10);
    });

    it('should only partially close the gap when maxTorque is limiting', () => {
      const world = new EcsWorld();
      const time = new Time();
      const physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });

      world.addSystem(
        createWheelMotorEcsSystem(time),
        SystemRegistrationOrder.early,
      );
      world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

      const wheel = createWheelEntity(world, physicsWorld, 10, 1);

      time.update(1000);
      world.update();

      expect(wheel.angularVelocity).toBeGreaterThan(0);
      expect(wheel.angularVelocity).toBeLessThan(10);
    });
  });

  describe('system registration order', () => {
    it('should apply torque within the same tick when registered before the physics system', () => {
      const world = new EcsWorld();
      const time = new Time();
      const physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });

      world.addSystem(
        createWheelMotorEcsSystem(time),
        SystemRegistrationOrder.early,
      );
      world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

      const wheel = createWheelEntity(world, physicsWorld, 10, 1000);

      time.update(1000);
      world.update();

      expect(wheel.angularVelocity).not.toBe(0);
    });

    it('should apply torque one tick late when registered after the physics system', () => {
      const world = new EcsWorld();
      const time = new Time();
      const physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });

      world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
      world.addSystem(
        createWheelMotorEcsSystem(time),
        SystemRegistrationOrder.late,
      );

      const wheel = createWheelEntity(world, physicsWorld, 10, 1000);

      time.update(1000);
      world.update();

      expect(wheel.angularVelocity).toBe(0);

      time.update(2000);
      world.update();

      expect(wheel.angularVelocity).not.toBe(0);
    });
  });

  describe('traction from ground friction', () => {
    it('should produce net thrust and damp spin growth for a wheel in contact with the ground, compared to a free-spinning wheel', () => {
      const torque = 5;
      const totalSteps = 60;
      const deltaTimeInSeconds = 1 / 60;

      const groundedWorld = new PhysicsWorld({ gravity: new Vector2(0, 50) });
      const groundBody = new RigidBody({
        shape: PolygonShape.rectangle(50, 2),
        position: new Vector2(0, 5),
        isStatic: true,
        friction: 1,
      });
      const groundedWheel = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 3.05),
        density: 1,
        friction: 1,
        restitution: 0,
      });

      groundedWorld.addBody(groundBody);
      groundedWorld.addBody(groundedWheel);

      const freeWorld = new PhysicsWorld({ gravity: Vector2.zero });
      const freeWheel = new RigidBody({
        shape: new CircleShape(1),
        density: 1,
        friction: 1,
      });

      freeWorld.addBody(freeWheel);

      for (let i = 0; i < totalSteps; i++) {
        groundedWheel.applyTorque(torque);
        groundedWorld.step(deltaTimeInSeconds);

        freeWheel.applyTorque(torque);
        freeWorld.step(deltaTimeInSeconds);
      }

      expect(Math.abs(groundedWheel.velocity.x)).toBeGreaterThan(0.5);
      expect(Math.abs(freeWheel.velocity.x)).toBeCloseTo(0);
      expect(Math.abs(freeWheel.angularVelocity)).toBeGreaterThan(
        Math.abs(groundedWheel.angularVelocity),
      );
    });
  });
});
