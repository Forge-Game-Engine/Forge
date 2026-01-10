import { describe, expect, it } from 'vitest';
import { LifetimeEcsComponent, lifetimeId } from '../../lifecycle';
import { EcsWorld, QueryResult } from '../../new-ecs';
import {
  AgeScaleEcsComponent,
  ageScaleId,
  ScaleEcsComponent,
  scaleId,
} from '../components';
import { Vector2 } from '../../math';
import { createAgeScaleEcsSystem } from './age-scale-system';

describe('AgeScaleSystem', () => {
  const world = new EcsWorld();
  it('should correctly update the scale based on lifetime ratio', () => {
    // Arrange
    const lifetimeComponent: LifetimeEcsComponent = {
      elapsedSeconds: 5,
      durationSeconds: 10,
      hasExpired: false,
    };

    const ageScaleComponent: AgeScaleEcsComponent = {
      originalScaleX: 1,
      originalScaleY: 1,
      finalLifetimeScaleX: 0.5,
      finalLifetimeScaleY: 0.1,
    };

    const scaleComponent: ScaleEcsComponent = {
      local: new Vector2(1, 1),
      world: new Vector2(1, 1),
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);
    world.addComponent(entity, ageScaleId, ageScaleComponent);
    world.addComponent(entity, scaleId, scaleComponent);

    const system = createAgeScaleEcsSystem();

    const queryResult: QueryResult<
      [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
    > = {
      entity,
      components: [lifetimeComponent, scaleComponent, ageScaleComponent],
    };

    // Act
    system.run(queryResult, world);

    // Assert
    const expectedScaleX = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    const expectedScaleY = 0.55; // Calculated as: 1 * (1 - 0.5) + 0.1 * 0.5
    expect(scaleComponent.local.x).toBe(expectedScaleX);
    expect(scaleComponent.local.y).toBe(expectedScaleY);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const lifetimeComponent: LifetimeEcsComponent = {
      elapsedSeconds: 10,
      durationSeconds: 10,
      hasExpired: false,
    };
    const ageScaleComponent: AgeScaleEcsComponent = {
      originalScaleX: 2,
      originalScaleY: 3,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0.3,
    };
    const scaleComponent: ScaleEcsComponent = {
      local: new Vector2(1, 1),
      world: new Vector2(1, 1),
    };

    const expectedScaleX = 0;
    const expectedScaleY = 0.3;

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);
    world.addComponent(entity, ageScaleId, ageScaleComponent);
    world.addComponent(entity, scaleId, scaleComponent);

    const system = createAgeScaleEcsSystem();

    const queryResult: QueryResult<
      [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
    > = {
      entity,
      components: [lifetimeComponent, scaleComponent, ageScaleComponent],
    };

    // Act
    system.run(queryResult, world);

    // Assert
    expect(scaleComponent.local.x).toBe(expectedScaleX);
    expect(scaleComponent.local.y).toBe(expectedScaleY);
  });
});
