import { beforeEach, describe, expect, it } from 'vitest';
import { createParticlePositionEcsSystem } from './particle-position-system';
import { EcsWorld } from '../../new-ecs';
import { ParticleEcsComponent, ParticleId } from '../components/particle-component';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  SpeedEcsComponent,
  speedId,
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

    const positionComponent: PositionEcsComponent = {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    };

    const rotationComponent: RotationEcsComponent = {
      local: 0, // facing up
      world: 0,
    };

    const speedComponent: SpeedEcsComponent = {
      speed: 100,
    };

    const particleComponent: ParticleEcsComponent = {
      rotationSpeed: 0,
    };

    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);
    world.addComponent(entity, speedId, speedComponent);
    world.addComponent(entity, ParticleId, particleComponent);

    time.update(100); // 0.1 seconds
    world.update();

    // Speed 100, delta 0.1s, rotation 0 (facing up)
    // x += 100 * 0.1 * sin(0) = 0
    // y -= 100 * 0.1 * cos(0) = -10
    expect(positionComponent.local.x).toBeCloseTo(0);
    expect(positionComponent.local.y).toBeCloseTo(-10);
  });

  it('should update particle rotation based on rotation speed', () => {
    const entity = world.createEntity();

    const positionComponent: PositionEcsComponent = {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    };

    const rotationComponent: RotationEcsComponent = {
      local: 0,
      world: 0,
    };

    const speedComponent: SpeedEcsComponent = {
      speed: 0,
    };

    const particleComponent: ParticleEcsComponent = {
      rotationSpeed: Math.PI, // 180 degrees per second
    };

    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);
    world.addComponent(entity, speedId, speedComponent);
    world.addComponent(entity, ParticleId, particleComponent);

    time.update(500); // 0.5 seconds
    world.update();

    // Rotation should be PI * 0.5 = PI/2
    expect(rotationComponent.local).toBeCloseTo(Math.PI / 2);
  });

  it('should handle multiple particles independently', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    };

    const pos2: PositionEcsComponent = {
      local: new Vector2(10, 10),
      world: new Vector2(10, 10),
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, { local: 0, world: 0 });
    world.addComponent(entity1, speedId, { speed: 50 });
    world.addComponent(entity1, ParticleId, { rotationSpeed: 0 });

    world.addComponent(entity2, positionId, pos2);
    world.addComponent(entity2, rotationId, { local: Math.PI / 2, world: Math.PI / 2 });
    world.addComponent(entity2, speedId, { speed: 100 });
    world.addComponent(entity2, ParticleId, { rotationSpeed: 0 });

    time.update(100); // 0.1 seconds
    world.update();

    // Entity 1: rotation 0, speed 50
    expect(pos1.local.x).toBeCloseTo(0);
    expect(pos1.local.y).toBeCloseTo(-5);

    // Entity 2: rotation PI/2 (facing right), speed 100
    // x += 100 * 0.1 * sin(PI/2) = 10
    // y -= 100 * 0.1 * cos(PI/2) = 0
    expect(pos2.local.x).toBeCloseTo(20);
    expect(pos2.local.y).toBeCloseTo(10);
  });
});
