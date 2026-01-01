import { beforeEach, describe, expect, it } from 'vitest';
import { LifetimeTrackingSystem } from './lifetime-tracking-system';
import { World } from '../../ecs';
import { LifetimeComponent } from '../components/lifetime-component';
import { Time } from '../../common';

describe('LifetimeTrackingSystem', () => {
  let world: World;
  let time: Time;

  beforeEach(() => {
    world = new World('test');
    time = new Time();
  });

  it('should update elapsed time each frame', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(5);
    world.buildAndAddEntity([lifetimeComponent]);
    const system = new LifetimeTrackingSystem(time);
    world.addSystem(system);

    // Act
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.elapsedSeconds).toBeGreaterThan(0);
    expect(lifetimeComponent.hasExpired).toBe(false);
  });

  it('should handle entities with elapsed time within duration', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(5);
    world.buildAndAddEntity([lifetimeComponent]);
    const system = new LifetimeTrackingSystem(time);
    world.addSystem(system);

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
    const lifetimeComponent = new LifetimeComponent(5);
    world.buildAndAddEntity([lifetimeComponent]);
    const system = new LifetimeTrackingSystem(time);
    world.addSystem(system);

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
    const lifetimeComponent = new LifetimeComponent(5);
    world.buildAndAddEntity([lifetimeComponent]);
    const system = new LifetimeTrackingSystem(time);
    world.addSystem(system);

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
    const lifetimeComponent = new LifetimeComponent(5);
    world.buildAndAddEntity([lifetimeComponent]);
    const system = new LifetimeTrackingSystem(time);
    world.addSystem(system);

    // Act
    lifetimeComponent.elapsedSeconds = 5;
    time.update(0.1);
    world.update();

    // Assert
    expect(lifetimeComponent.hasExpired).toBe(true);
    expect(world.entityCount).toBe(1); // Entity should still be in world
  });
});
