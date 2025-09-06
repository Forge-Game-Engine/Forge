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
    const ageScaleComponent = new AgeScaleComponent(1, 1, 0.5, 0.1); // originalScale = (1,1), lifetimeScaleReduction = (0.5,0.1)
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
    const expectedScaleX = 0.75; // Calculated as: 1 * (1 - 0.5) + 0.5 * 0.5
    const expectedScaleY = 0.55; // Calculated as: 1 * (1 - 0.5) + 0.1 * 0.5
    expect(scaleComponent.x).toBe(expectedScaleX);
    expect(scaleComponent.y).toBe(expectedScaleY);
  });

  it('should show the end scale at the end of the lifetime', () => {
    // Arrange
    const ageComponent = new AgeComponent(10); // ageSeconds = 5, lifetimeSeconds = 10
    ageComponent.ageSeconds = 10;
    const ageScaleComponent = new AgeScaleComponent(2, 3, 0, 0.3); // originalScale = (2,3), lifetimeScaleReduction = (0,0.3)
    const expectedScaleX = 0;
    const expectedScaleY = 0.3;
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
    expect(scaleComponent.x).toBe(expectedScaleX);
    expect(scaleComponent.y).toBe(expectedScaleY);
  });
});
