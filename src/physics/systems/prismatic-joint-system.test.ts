import { beforeEach, describe, expect, it } from 'vitest';
import { createPrismaticJointEcsSystem } from './prismatic-joint-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';
import { addPrismaticJointComponent } from '../components/prismatic-joint-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
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

describe('createPrismaticJointEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let currentMs: number;

  const dtMs = 1000 / 60;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    currentMs = 0;
    time.update(currentMs);

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createPrismaticJointEcsSystem(time));
    world.addSystem(createEulerIntegrationEcsSystem(time));
  });

  function tick(): void {
    currentMs += dtMs;
    time.update(currentMs);
    world.update();
  }

  it('keeps perpendicular displacement near zero while axial displacement is free', () => {
    const anchor = world.createEntity();
    addPositionComponent(world, anchor, {
      local: Vec2.zero,
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    const sliderPosition = addPositionComponent(world, slider, {
      local: Vec2.zero,
    });
    addRotationComponent(world, slider);
    addUnitMassCollider(world, slider);
    addRigidBodyComponent(world, slider, {
      velocity: { x: 2, y: 3 },
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: Vec2.right,
    });

    let maxPerpendicular = 0;

    for (let i = 0; i < 120; i++) {
      tick();
      maxPerpendicular = Math.max(
        maxPerpendicular,
        Math.abs(sliderPosition.world.y),
      );
    }

    expect(maxPerpendicular).toBeLessThan(0.05);
    expect(sliderPosition.world.x).toBeGreaterThan(1);
  });

  it('locks relative rotation to the reference angle', () => {
    const anchor = world.createEntity();
    addPositionComponent(world, anchor, {
      local: Vec2.zero,
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    addPositionComponent(world, slider, {
      local: Vec2.zero,
    });
    const sliderRotation = addRotationComponent(world, slider);
    addUnitMassCollider(world, slider);
    addRigidBodyComponent(world, slider, {
      angularVelocity: 5,
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: Vec2.right,
    });

    for (let i = 0; i < 60; i++) {
      tick();
    }

    expect(sliderRotation.world).toBeCloseTo(0, 1);
  });

  it('respects a translation limit', () => {
    const anchor = world.createEntity();
    addPositionComponent(world, anchor, {
      local: Vec2.zero,
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    const sliderPosition = addPositionComponent(world, slider, {
      local: Vec2.zero,
    });
    addRotationComponent(world, slider);
    addUnitMassCollider(world, slider);
    addRigidBodyComponent(world, slider, {
      velocity: { x: 3, y: 0 },
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: Vec2.right,
      enableLimit: true,
      lowerTranslation: 0,
      upperTranslation: 1,
    });

    let maxTranslation = 0;

    for (let i = 0; i < 120; i++) {
      tick();
      maxTranslation = Math.max(maxTranslation, sliderPosition.world.x);
    }

    expect(maxTranslation).toBeLessThan(1.2);
  });
});
