import { describe, expect, it } from 'vitest';
import { Entity, World } from 'forge/ecs';
import { AgeScaleSystem } from './age-scale-system';
import { LifetimeComponent } from 'forge/lifecycle/components/lifetime-component';
import { AgeScaleComponent, ScaleComponent } from 'forge/common';

describe('AgeScaleSystem', () => {
  const world = new World('test');
  it('should correctly update the scale based on lifetime ratio', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(10); // elapsedSeconds = 5, durationSeconds = 10
    lifetimeComponent.elapsedSeconds = 5;
    const ageScaleComponent = new AgeScaleComponent(1, 1, 0.5, 0.1); // originalScale = (1,1), lifetimeScaleReduction = (0.5,0.1)
    const scaleComponent = new ScaleComponent(1, 1);

    const entity = new Entity('test', world, [
      lifetimeComponent,
      scaleComponent,
      ageScaleComponent,
    ]);

    const system = new AgeScaleSystem();

    // Act
    system.run(entity);

    // Assert
    const expectedScaleX = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    const expectedScaleY = 0.55; // Calculated as: 1 * (1 - 0.5) + 0.1 * 0.5
    expect(scaleComponent.local.x).toBe(expectedScaleX);
    expect(scaleComponent.local.y).toBe(expectedScaleY);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(10); // elapsedSeconds = 10, durationSeconds = 10
    lifetimeComponent.elapsedSeconds = 10;
    const ageScaleComponent = new AgeScaleComponent(2, 3, 0, 0.3); // originalScale = (2,3), lifetimeScaleReduction = (0,0.3)
    const expectedScaleX = 0;
    const expectedScaleY = 0.3;
    const scaleComponent = new ScaleComponent(1, 1);

    const entity = new Entity('test', world, [
      lifetimeComponent,
      scaleComponent,
      ageScaleComponent,
    ]);

    const system = new AgeScaleSystem();

    // Act
    system.run(entity);

    // Assert
    expect(scaleComponent.local.x).toBe(expectedScaleX);
    expect(scaleComponent.local.y).toBe(expectedScaleY);
  });
});
