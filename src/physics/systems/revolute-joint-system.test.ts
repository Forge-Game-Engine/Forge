import { beforeEach, describe, expect, it } from 'vitest';
import { createRevoluteJointEcsSystem } from './revolute-joint-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { addRevoluteJointComponent } from '../components/revolute-joint-component.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
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

describe('createRevoluteJointEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let currentMs: number;

  const dtMs = 1000 / 60;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    currentMs = 0;
    time.update(currentMs);

    world.addSystem(createRevoluteJointEcsSystem(time));
    world.addSystem(createEulerIntegrationEcsSystem(time));
  });

  function tick(): void {
    currentMs += dtMs;
    time.update(currentMs);
    world.update();
  }

  it("swings a body about a pivot at its entity's origin, away from its center of mass", () => {
    world.addSystem(createTransformEcsSystem());

    const pivot = world.createEntity();
    addPositionComponent(world, pivot);
    addRotationComponent(world, pivot);

    // A pendulum whose bob is the circle 5 units below the entity's origin,
    // pinned to the pivot at that origin: the joint anchor is 5 units from
    // the body's center of mass.
    const pendulum = world.createEntity();
    const pendulumPosition = addPositionComponent(world, pendulum);
    const pendulumRotation = addRotationComponent(world, pendulum);
    addColliderComponent(world, pendulum, {
      collider: new CircleCollider(1, 1, { x: 0, y: -5 }),
    });
    const rigidBody = addRigidBodyComponent(world, pendulum, {
      velocity: { x: 3, y: 0 },
    });

    const jointEntity = world.createEntity();
    addRevoluteJointComponent(world, jointEntity, {
      entityA: pivot,
      entityB: pendulum,
    });

    let maxRotation = 0;

    for (let i = 0; i < 60; i++) {
      Vec2.add(rigidBody.velocity, { x: 0, y: -9.8 * (1 / 60) });
      tick();
      maxRotation = Math.max(maxRotation, pendulumRotation.local);

      expect(Vec2.magnitude(pendulumPosition.local)).toBeLessThan(0.1);
    }

    // The bob swung up to the right: the body turned about the pivot rather
    // than sliding its origin away from it.
    expect(maxRotation).toBeGreaterThan(0.3);
  });

  it('keeps a dynamic body pinned to a static pivot under repeated gravity-like kicks', () => {
    const pivot = world.createEntity();
    addPositionComponent(world, pivot, {
      local: Vec2.zero,
    });
    addRotationComponent(world, pivot);

    const ball = world.createEntity();
    const ballPosition = addPositionComponent(world, ball, {
      local: { x: 0, y: -5 },
    });
    const ballRotation = addRotationComponent(world, ball);
    addUnitMassCollider(world, ball);
    const ballRigidBody = addRigidBodyComponent(world, ball);

    const jointEntity = world.createEntity();
    addRevoluteJointComponent(world, jointEntity, {
      entityA: pivot,
      entityB: ball,
      localAnchorB: { x: 0, y: 5 },
    });

    for (let i = 0; i < 180; i++) {
      Vec2.add(ballRigidBody.velocity, { x: 0, y: -9.8 * (1 / 60) });
      tick();
    }

    const anchorB = Vec2.add(
      Vec2.clone(ballPosition.world),
      Vec2.rotate({ x: 0, y: 5 }, ballRotation.world),
    );
    const separation = Vec2.magnitude(anchorB);

    expect(separation).toBeLessThan(0.05);
  });

  it('never lets the relative angle exceed an enabled limit', () => {
    const bodyA = world.createEntity();
    addPositionComponent(world, bodyA, {
      local: Vec2.zero,
    });
    const bodyARotation = addRotationComponent(world, bodyA);
    addUnitMassCollider(world, bodyA);
    addRigidBodyComponent(world, bodyA);

    const bodyB = world.createEntity();
    addPositionComponent(world, bodyB, {
      local: Vec2.zero,
    });
    const bodyBRotation = addRotationComponent(world, bodyB);
    addUnitMassCollider(world, bodyB);
    addRigidBodyComponent(world, bodyB, {
      angularVelocity: 3,
    });

    const jointEntity = world.createEntity();
    addRevoluteJointComponent(world, jointEntity, {
      entityA: bodyA,
      entityB: bodyB,
      enableLimit: true,
      lowerAngle: -0.5,
      upperAngle: 0.5,
    });

    let maxRelativeAngle = 0;

    for (let i = 0; i < 180; i++) {
      tick();
      maxRelativeAngle = Math.max(
        maxRelativeAngle,
        Math.abs(bodyBRotation.world - bodyARotation.world),
      );
    }

    expect(maxRelativeAngle).toBeLessThan(0.6);
  });

  it('keeps accumulated point impulse bounded (does not diverge) across many ticks', () => {
    const pivot = world.createEntity();
    addPositionComponent(world, pivot, {
      local: Vec2.zero,
    });
    addRotationComponent(world, pivot);

    const ball = world.createEntity();
    addPositionComponent(world, ball, {
      local: { x: 3, y: 0 },
    });
    addRotationComponent(world, ball);
    addUnitMassCollider(world, ball);
    addRigidBodyComponent(world, ball);

    const jointEntity = world.createEntity();
    const joint = addRevoluteJointComponent(world, jointEntity, {
      entityA: pivot,
      entityB: ball,
      localAnchorB: { x: -3, y: 0 },
    });

    for (let i = 0; i < 300; i++) {
      tick();
    }

    expect(Number.isFinite(joint.accumulatedPointImpulse.x)).toBe(true);
    expect(Number.isFinite(joint.accumulatedPointImpulse.y)).toBe(true);
    expect(Vec2.magnitude(joint.accumulatedPointImpulse)).toBeLessThan(1000);
  });
});
