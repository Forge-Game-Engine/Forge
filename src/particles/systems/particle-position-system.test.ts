import { beforeEach, describe, expect, it } from 'vitest';
import { ParticlePositionSystem } from './particle-position-system';
import { Entity, World } from '../../ecs';
import { ParticleComponent } from '../components/particle-component';
import {
  PositionComponent,
  RotationComponent,
  SpeedComponent,
  Time,
} from '../../common';

describe('ParticlePositionSystem', () => {
  const time = { deltaTimeInSeconds: 0.016 } as Time;
  const system = new ParticlePositionSystem(time);
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity('entity', {} as World, [
      new PositionComponent(0, 0),
      new RotationComponent(20),
      new SpeedComponent(10),
      new ParticleComponent({
        rotationSpeed: Math.PI,
      }),
    ]);
  });

  it('should update rotation based on rotation speed and delta time', () => {
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );
    const initialRadians = rotationComponent.radians;

    system.run(entity);

    expect(rotationComponent.radians).toBeCloseTo(
      initialRadians + Math.PI * time.deltaTimeInSeconds,
    );
  });

  it('should update position based on speed, rotation, and delta time', () => {
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );
    const speedComponent = entity.getComponentRequired<SpeedComponent>(
      SpeedComponent.symbol,
    );

    const expectedX =
      positionComponent.x +
      speedComponent.speed *
        time.deltaTimeInSeconds *
        Math.sin(rotationComponent.radians);
    const expectedY =
      positionComponent.y -
      speedComponent.speed *
        time.deltaTimeInSeconds *
        Math.cos(rotationComponent.radians);

    system.run(entity);
    expect(positionComponent.x).toBeCloseTo(expectedX);
    expect(positionComponent.y).toBeCloseTo(expectedY);
  });

  it('should handle multiple runs correctly', () => {
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );
    const speedComponent = entity.getComponentRequired<SpeedComponent>(
      SpeedComponent.symbol,
    );

    const newRotation =
      rotationComponent.radians + Math.PI * time.deltaTimeInSeconds;
    const expectedRotation = newRotation + Math.PI * time.deltaTimeInSeconds;

    const expectedX =
      positionComponent.x +
      speedComponent.speed *
        time.deltaTimeInSeconds *
        (Math.sin(rotationComponent.radians) + Math.sin(newRotation));
    const expectedY =
      positionComponent.y -
      speedComponent.speed *
        time.deltaTimeInSeconds *
        (Math.cos(rotationComponent.radians) + Math.cos(newRotation));

    system.run(entity);
    system.run(entity);

    expect(rotationComponent.radians).toBeCloseTo(expectedRotation);
    expect(positionComponent.x).toBeCloseTo(expectedX);
    expect(positionComponent.y).toBeCloseTo(expectedY);
  });
});
