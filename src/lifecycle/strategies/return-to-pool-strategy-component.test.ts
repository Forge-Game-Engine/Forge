import { describe, expect, it, vi } from 'vitest';
import { ReturnToPoolStrategyComponent } from './return-to-pool-strategy-component';
import { ObjectPool } from 'forge/pooling';

describe('ReturnToPoolStrategyComponent', () => {
  it('should initialize with correct symbol and pool reference', () => {
    // Arrange
    const pool = new ObjectPool<{ value: number }>({
      createCallback: () => ({ value: 0 }),
      disposeCallback: vi.fn(),
    });

    // Act
    const component = new ReturnToPoolStrategyComponent(pool);

    // Assert
    expect(component.name).toBe(ReturnToPoolStrategyComponent.symbol);
    expect(component.pool).toBe(pool);
  });

  it('should store the pool reference correctly', () => {
    // Arrange
    const pool = new ObjectPool<{ value: number }>({
      createCallback: () => ({ value: 42 }),
      disposeCallback: vi.fn(),
    });

    // Act
    const component = new ReturnToPoolStrategyComponent(pool);

    // Assert
    expect(component.pool).toBe(pool);
  });

  it('should be a data-only component', () => {
    // Arrange
    const pool = new ObjectPool<{ value: number }>({
      createCallback: () => ({ value: 0 }),
      disposeCallback: vi.fn(),
    });

    // Act
    const component = new ReturnToPoolStrategyComponent(pool);

    // Assert - verify it's a simple data container
    expect(component.name).toBe(ReturnToPoolStrategyComponent.symbol);
    expect(component.pool).toBe(pool);
  });
});
