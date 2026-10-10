import { beforeEach, describe, expect, it } from 'vitest';
import { addLifetimeComponent } from '../../lifecycle/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addAgeScaleComponent,
  addScaleComponent,
} from '../components/index.js';
import { createAgeScaleEcsSystem } from './age-scale-system.js';

describe('AgeScaleSystem', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  it('should correctly update the scale based on lifetime ratio', () => {
    // Arrange
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      elapsedSeconds: 5,
      durationSeconds: 10,
    });

    addAgeScaleComponent(world, entity, {
      finalLifetimeScaleX: 0.5,
      finalLifetimeScaleY: 0.1,
    });

    const scaleComponent = addScaleComponent(world, entity);

    const system = createAgeScaleEcsSystem();

    // Act
    world.addSystem(system);
    world.update();

    // Assert
    const expectedScaleX = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    const expectedScaleY = 0.55; // Calculated as: 1 * (1 - 0.5) + 0.1 * 0.5
    expect(scaleComponent.local.x).toBeCloseTo(expectedScaleX);
    expect(scaleComponent.local.y).toBeCloseTo(expectedScaleY);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      elapsedSeconds: 10,
      durationSeconds: 10,
    });

    addAgeScaleComponent(world, entity, {
      originalScaleX: 2,
      originalScaleY: 3,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0.3,
    });

    const scaleComponent = addScaleComponent(world, entity);

    const expectedScaleX = 0;
    const expectedScaleY = 0.3;

    const system = createAgeScaleEcsSystem();

    // Act
    world.addSystem(system);
    world.update();

    // Assert
    expect(scaleComponent.local.x).toBeCloseTo(expectedScaleX);
    expect(scaleComponent.local.y).toBeCloseTo(expectedScaleY);
  });

  it('only writes the local scale, leaving world to the transform system', () => {
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      elapsedSeconds: 5,
      durationSeconds: 10,
    });
    addAgeScaleComponent(world, entity, {
      originalScaleX: 4,
      originalScaleY: 4,
      finalLifetimeScaleX: 0,
      finalLifetimeScaleY: 0,
    });

    const scaleComponent = addScaleComponent(world, entity);
    const system = createAgeScaleEcsSystem();

    world.addSystem(system);
    world.update();

    expect(scaleComponent.local).toEqual({ x: 2, y: 2 });
    expect(scaleComponent.world).toEqual({ x: 1, y: 1 });
  });
});
