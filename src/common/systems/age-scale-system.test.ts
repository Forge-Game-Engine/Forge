import { describe, expect, it } from 'vitest';
import { addLifetimeComponent, LifetimeEcsComponent } from '../../lifecycle';
import { EcsWorld, QueryResult } from '../../ecs';
import {
  addAgeScaleComponent,
  addScaleComponent,
  AgeScaleEcsComponent,
  ScaleEcsComponent,
} from '../components';
import { createAgeScaleEcsSystem } from './age-scale-system';

describe('AgeScaleSystem', () => {
  const world = new EcsWorld();
  it('should correctly update the scale based on lifetime ratio', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      elapsedSeconds: 5,
      durationSeconds: 10,
    });

    const ageScaleComponent = addAgeScaleComponent(world, entity, {
      finalLifetimeScaleX: 0.5,
      finalLifetimeScaleY: 0.1,
    });

    const scaleComponent = addScaleComponent(world, entity);

    const system = createAgeScaleEcsSystem();

    const queryResult: QueryResult<
      [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
    > = {
      entity,
      components: [lifetimeComponent, scaleComponent, ageScaleComponent],
    };

    // Act
    system.run(queryResult, world, null);

    // Assert
    const expectedScaleX = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    const expectedScaleY = 0.55; // Calculated as: 1 * (1 - 0.5) + 0.1 * 0.5
    expect(scaleComponent.local.x).toBeCloseTo(expectedScaleX);
    expect(scaleComponent.local.y).toBeCloseTo(expectedScaleY);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      elapsedSeconds: 10,
      durationSeconds: 10,
    });

    const ageScaleComponent = addAgeScaleComponent(world, entity, {
      originalScaleX: 2,
      originalScaleY: 3,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0.3,
    });

    const scaleComponent = addScaleComponent(world, entity);

    const expectedScaleX = 0;
    const expectedScaleY = 0.3;

    const system = createAgeScaleEcsSystem();

    const queryResult: QueryResult<
      [LifetimeEcsComponent, ScaleEcsComponent, AgeScaleEcsComponent]
    > = {
      entity,
      components: [lifetimeComponent, scaleComponent, ageScaleComponent],
    };

    // Act
    system.run(queryResult, world, null);

    // Assert
    expect(scaleComponent.local.x).toBeCloseTo(expectedScaleX);
    expect(scaleComponent.local.y).toBeCloseTo(expectedScaleY);
  });
});
