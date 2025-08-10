import { describe, expect, it } from 'vitest';
import { Entity, World } from '../../ecs';
import { AgeScaleSystem } from './age-scale-system';
import { AgeComponent } from '../../common/components/age-component';
import { AgeScaleComponent, ScaleComponent } from '../../common';

describe('AgeScaleSystem', () => {
  const world = new World('test');
  it('should correctly update the scale based on age ratio', () => {
    // Arrange
    const ageComponent = new AgeComponent(10); // ageSeconds = 5, lifetimeSeconds = 10
    ageComponent.ageSeconds = 5;
    const ageScaleComponent = new AgeScaleComponent(1, 0.5); // originalScale = 1, lifetimeScaleReduction = 0.5
    const scaleComponent = new ScaleComponent(1, 1);

    const entity = new Entity('test', world, [
      ageComponent,
      scaleComponent,
      ageScaleComponent,
    ]);

    const system = new AgeScaleSystem();

    // Act
    system.run(entity);

    // Assert
    const expectedScale = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    expect(scaleComponent.x).toBe(expectedScale);
    expect(scaleComponent.y).toBe(expectedScale);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const expectedScale = 0.79;
    const ageComponent = new AgeComponent(10); // ageSeconds = 5, lifetimeSeconds = 10
    ageComponent.ageSeconds = 10;
    const ageScaleComponent = new AgeScaleComponent(1, expectedScale); // originalScale = 1, lifetimeScaleReduction = 0.5
    const scaleComponent = new ScaleComponent(1, 1);

    const entity = new Entity('test', world, [
      ageComponent,
      scaleComponent,
      ageScaleComponent,
    ]);

    const system = new AgeScaleSystem();

    // Act
    system.run(entity);

    // Assert
    expect(scaleComponent.x).toBe(expectedScale);
    expect(scaleComponent.y).toBe(expectedScale);
  });
});
