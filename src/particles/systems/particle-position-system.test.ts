import { beforeEach, describe, expect, it } from 'vitest';
import { createParticlePositionEcsSystem } from './particle-position-system';
import { EcsWorld } from '../../ecs';
import { addParticleComponent } from '../components/particle-component';
import {
  addPositionComponent,
  addRotationComponent,
  addSpeedComponent,
  Time,
} from '../../common';
import { Vector2 } from '../../math';

describe('ParticlePositionSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createParticlePositionEcsSystem(time));
  });

  it('should update particle position based on speed and rotation', () => {
    const entity = world.createEntity();

    const positionComponent = addPositionComponent(world, entity);

    addRotationComponent(world, entity); // facing up

    addSpeedComponent(world, entity, { speed: 100 });

    addParticleComponent(world, entity);

    time.update(100);
    world.update();

    expect(positionComponent.local.x).toBeCloseTo(0);
    expect(positionComponent.local.y).toBeCloseTo(-10);
  });

  it('should update particle rotation based on rotation speed', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    const rotationComponent = addRotationComponent(world, entity);

    addSpeedComponent(world, entity);

    addParticleComponent(world, entity, { rotationSpeed: Math.PI });

    time.update(500);
    world.update();

    expect(rotationComponent.local).toBeCloseTo(Math.PI / 2);
  });

  it('should handle multiple particles independently', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1 = addPositionComponent(world, entity1);

    addRotationComponent(world, entity1);
    addSpeedComponent(world, entity1, { speed: 50 });
    addParticleComponent(world, entity1);

    const pos2 = addPositionComponent(world, entity2, {
      local: new Vector2(10, 10),
      world: new Vector2(10, 10),
    });

    addRotationComponent(world, entity2, {
      local: Math.PI / 2,
      world: Math.PI / 2,
    });
    addSpeedComponent(world, entity2, { speed: 100 });
    addParticleComponent(world, entity2);

    time.update(100);
    world.update();

    expect(pos1.local.x).toBeCloseTo(0);
    expect(pos1.local.y).toBeCloseTo(-5);

    expect(pos2.local.x).toBeCloseTo(20);
    expect(pos2.local.y).toBeCloseTo(10);
  });
});
