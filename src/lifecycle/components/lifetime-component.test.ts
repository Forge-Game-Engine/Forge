import { describe, expect, it } from 'vitest';
import { LifetimeComponent } from './lifetime-component';

describe('LifetimeComponent', () => {
  it('should initialize with correct default values', () => {
    // Arrange & Act
    const component = new LifetimeComponent(5);

    // Assert
    expect(component.name).toBe(LifetimeComponent.symbol);
    expect(component.elapsedSeconds).toBe(0);
    expect(component.durationSeconds).toBe(5);
    expect(component.hasExpired).toBe(false);
  });

  it('should store the duration seconds value', () => {
    // Arrange & Act
    const component = new LifetimeComponent(10.5);

    // Assert
    expect(component.durationSeconds).toBe(10.5);
  });

  it('should be a data-only component', () => {
    // Arrange & Act
    const component = new LifetimeComponent(5);

    // Assert - verify it's a simple data container
    expect(component.elapsedSeconds).toBe(0);
    expect(component.durationSeconds).toBe(5);
    expect(component.hasExpired).toBe(false);
  });
});
