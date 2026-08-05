import { beforeEach, describe, expect, it } from 'vitest';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addRigidBodyComponent,
  RigidBodyType,
} from '../components/rigidbody-component.js';

describe('createEulerIntegrationEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    world.addSystem(createEulerIntegrationEcsSystem(time));
  });

  function createBody(type: RigidBodyType): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: { x: 0, y: 0 },
      local: { x: 0, y: 0 },
    });
    addRotationComponent(world, entity);

    addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      velocity: { x: 1, y: 0 },
      angularVelocity: 1,
      type,
    });

    return entity;
  }

  it('integrates a dynamic body position/rotation from velocity/angularVelocity', () => {
    const entity = createBody('dynamic');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.world.x).toBeGreaterThan(0);
    expect(rotation.world).toBeGreaterThan(0);
  });

  it('integrates a kinematic body the same as a dynamic one', () => {
    const entity = createBody('kinematic');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.world.x).toBeGreaterThan(0);
    expect(rotation.world).toBeGreaterThan(0);
  });

  it('never moves a static body, even with a nonzero velocity', () => {
    const entity = createBody('static');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.world).toEqual({ x: 0, y: 0 });
    expect(rotation.world).toBe(0);
  });
});
