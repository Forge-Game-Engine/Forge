import { beforeEach, describe, expect, it } from 'vitest';
import { createRevoluteJointEcsSystem } from './revolute-joint-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  createVector2,
  vector2Add,
  vector2Clone,
  vector2Magnitude,
  vector2Rotate,
  vector2Zero,
} from '../../math/index.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { addRevoluteJointComponent } from '../components/revolute-joint-component.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';

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

  it('keeps a dynamic body pinned to a static pivot under repeated gravity-like kicks', () => {
    const pivot = world.createEntity();
    addPositionComponent(world, pivot, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, pivot);

    const ball = world.createEntity();
    const ballPosition = addPositionComponent(world, ball, {
      world: createVector2(0, -5),
      local: createVector2(0, -5),
    });
    const ballRotation = addRotationComponent(world, ball);
    const ballRigidBody = addRigidBodyComponent(world, ball, {
      mass: 1,
      momentOfInertia: 1,
    });

    const jointEntity = world.createEntity();
    addRevoluteJointComponent(world, jointEntity, {
      entityA: pivot,
      entityB: ball,
      localAnchorB: createVector2(0, 5),
    });

    for (let i = 0; i < 180; i++) {
      vector2Add(ballRigidBody.velocity, createVector2(0, -9.8 * (1 / 60)));
      tick();
    }

    const anchorB = vector2Add(
      vector2Clone(ballPosition.world),
      vector2Rotate(createVector2(0, 5), ballRotation.world),
    );
    const separation = vector2Magnitude(anchorB);

    expect(separation).toBeLessThan(0.05);
  });

  it('never lets the relative angle exceed an enabled limit', () => {
    const bodyA = world.createEntity();
    addPositionComponent(world, bodyA, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    const bodyARotation = addRotationComponent(world, bodyA);
    addRigidBodyComponent(world, bodyA, { mass: 1, momentOfInertia: 1 });

    const bodyB = world.createEntity();
    addPositionComponent(world, bodyB, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    const bodyBRotation = addRotationComponent(world, bodyB);
    addRigidBodyComponent(world, bodyB, {
      mass: 1,
      momentOfInertia: 1,
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
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, pivot);

    const ball = world.createEntity();
    addPositionComponent(world, ball, {
      world: createVector2(3, 0),
      local: createVector2(3, 0),
    });
    addRotationComponent(world, ball);
    addRigidBodyComponent(world, ball, { mass: 1, momentOfInertia: 1 });

    const jointEntity = world.createEntity();
    const joint = addRevoluteJointComponent(world, jointEntity, {
      entityA: pivot,
      entityB: ball,
      localAnchorB: createVector2(-3, 0),
    });

    for (let i = 0; i < 300; i++) {
      tick();
    }

    expect(Number.isFinite(joint.accumulatedPointImpulse.x)).toBe(true);
    expect(Number.isFinite(joint.accumulatedPointImpulse.y)).toBe(true);
    expect(vector2Magnitude(joint.accumulatedPointImpulse)).toBeLessThan(1000);
  });
});
