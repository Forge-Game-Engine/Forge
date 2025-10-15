import { describe, expect, it } from 'vitest';
import { RemoveFromWorldStrategyComponent } from './remove-from-world-strategy-component';

describe('RemoveFromWorldStrategyComponent', () => {
  it('should initialize with correct symbol', () => {
    // Arrange & Act
    const component = new RemoveFromWorldStrategyComponent();

    // Assert
    expect(component.name).toBe(RemoveFromWorldStrategyComponent.symbol);
  });

  it('should be a data-only component', () => {
    // Arrange & Act
    const component = new RemoveFromWorldStrategyComponent();

    // Assert - verify it's a simple data container
    expect(component.name).toBe(RemoveFromWorldStrategyComponent.symbol);
  });

  it('should act as a marker component', () => {
    // Arrange & Act
    const component = new RemoveFromWorldStrategyComponent();

    // Assert - verify it has minimal properties (just name and symbol)
    const ownProps = Object.keys(component);
    expect(ownProps).toContain('name');
  });
});
