import { describe, expect, it } from 'vitest';
import { canvasToWorldSpace } from './canvas-to-world-space';

describe('canvasToWorldSpace', () => {
  it('should convert canvas position to world position correctly', () => {
    const canvasPosition = { x: 100, y: 200 };
    const worldCenter = { x: 300, y: 400 };
    const expectedWorldPosition = { x: 400, y: 600 };

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle negative canvas position correctly', () => {
    const canvasPosition = { x: -100, y: -200 };
    const worldCenter = { x: 300, y: 400 };
    const expectedWorldPosition = { x: 200, y: 200 };

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero canvas position correctly', () => {
    const canvasPosition = { x: 0, y: 0 };
    const worldCenter = { x: 300, y: 400 };
    const expectedWorldPosition = { x: 300, y: 400 };

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero world center correctly', () => {
    const canvasPosition = { x: 100, y: 200 };
    const worldCenter = { x: 0, y: 0 };
    const expectedWorldPosition = { x: 100, y: 200 };

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle both zero canvas position and world center correctly', () => {
    const canvasPosition = { x: 0, y: 0 };
    const worldCenter = { x: 0, y: 0 };
    const expectedWorldPosition = { x: 0, y: 0 };

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });
});
