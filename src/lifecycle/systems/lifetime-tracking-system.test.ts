import { beforeEach, describe, expect, it } from 'vitest';
import { createLifetimeTrackingEcsSystem } from './lifetime-tracking-system';
import { addLifetimeComponent } from '../components/lifetime-component';
import { Time } from '../../common';
import { EcsWorld } from '../../ecs';

describe('LifetimeTrackingSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createLifetimeTrackingEcsSystem(time));
  });

  it('should update elapsed time each frame', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    // Act
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThan(0);
    expect(lifetimeComponent.hasExpired).toBe(false);
  });

  it('should handle entities with elapsed time within duration', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    // Act
    lifetimeComponent.elapsedSeconds = 3; // Set elapsed to less than duration
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThan(3);
    expect(lifetimeComponent.hasExpired).toBe(false);
  });

  it('should set hasExpired to true when elapsed time equals duration', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    // Act
    lifetimeComponent.elapsedSeconds = 5;
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThanOrEqual(5);
    expect(lifetimeComponent.hasExpired).toBe(true);
  });

  it('should set hasExpired to true when elapsed time exceeds duration', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    // Act
    lifetimeComponent.elapsedSeconds = 5.1;
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThan(5.1);
    expect(lifetimeComponent.hasExpired).toBe(true);
  });

  it('should not remove entity from world - only track lifetime', () => {
    // Arrange
    const entity = world.createEntity();

    const lifetimeComponent = addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    // Act
    lifetimeComponent.elapsedSeconds = 5;
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.hasExpired).toBe(true);
  });
});
