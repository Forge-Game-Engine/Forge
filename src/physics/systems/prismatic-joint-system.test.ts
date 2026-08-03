import { beforeEach, describe, expect, it } from 'vitest';
import { createPrismaticJointEcsSystem } from './prismatic-joint-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { createVector2, vector2Right, vector2Zero } from '../../math/index.js';
import { addPrismaticJointComponent } from '../components/prismatic-joint-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';

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
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    const sliderPosition = addPositionComponent(world, slider, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, slider);
    addRigidBodyComponent(world, slider, {
      mass: 1,
      momentOfInertia: 1,
      velocity: createVector2(2, 3),
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: vector2Right(),
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
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    addPositionComponent(world, slider, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    const sliderRotation = addRotationComponent(world, slider);
    addRigidBodyComponent(world, slider, {
      mass: 1,
      momentOfInertia: 1,
      angularVelocity: 5,
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: vector2Right(),
    });

    for (let i = 0; i < 60; i++) {
      tick();
    }

    expect(sliderRotation.world).toBeCloseTo(0, 1);
  });

  it('respects a translation limit', () => {
    const anchor = world.createEntity();
    addPositionComponent(world, anchor, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, anchor);

    const slider = world.createEntity();
    const sliderPosition = addPositionComponent(world, slider, {
      world: vector2Zero(),
      local: vector2Zero(),
    });
    addRotationComponent(world, slider);
    addRigidBodyComponent(world, slider, {
      mass: 1,
      momentOfInertia: 1,
      velocity: createVector2(3, 0),
    });

    const jointEntity = world.createEntity();
    addPrismaticJointComponent(world, jointEntity, {
      entityA: anchor,
      entityB: slider,
      axis: vector2Right(),
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
