import { beforeEach, describe, expect, it } from 'vitest';
import { createLifetimeTrackingEcsSystem } from './lifetime-tracking-system';
import {
  LifetimeEcsComponent,
  lifetimeId,
} from '../components/lifetime-component';
import { Time } from '../../common';
import { EcsWorld } from '../../new-ecs';

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
    const lifetimeComponent: LifetimeEcsComponent = {
      durationSeconds: 5,
      elapsedSeconds: 0,
      hasExpired: false,
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);

    // Act
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThan(0);
    expect(lifetimeComponent.hasExpired).toBe(false);
  });

  it('should handle entities with elapsed time within duration', () => {
    // Arrange
    const lifetimeComponent: LifetimeEcsComponent = {
      durationSeconds: 5,
      elapsedSeconds: 0,
      hasExpired: false,
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);

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
    const lifetimeComponent: LifetimeEcsComponent = {
      durationSeconds: 5,
      elapsedSeconds: 0,
      hasExpired: false,
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);

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
    const lifetimeComponent: LifetimeEcsComponent = {
      durationSeconds: 5,
      elapsedSeconds: 0,
      hasExpired: false,
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);

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
    const lifetimeComponent: LifetimeEcsComponent = {
      durationSeconds: 5,
      elapsedSeconds: 0,
      hasExpired: false,
    };

    const entity = world.createEntity();

    world.addComponent(entity, lifetimeId, lifetimeComponent);
    // Act
    lifetimeComponent.elapsedSeconds = 5;
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.hasExpired).toBe(true);
  });
});
