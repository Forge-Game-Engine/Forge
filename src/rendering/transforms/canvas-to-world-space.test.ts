import { describe, expect, it } from 'vitest';
import { canvasToWorldSpace } from './canvas-to-world-space';
import { Vector2 } from 'forge/math';

describe('canvasToWorldSpace', () => {
  it('should convert canvas position to world position correctly', () => {
    const canvasPosition = new Vector2(100, 200);
    const worldCenter = new Vector2(300, 400);
    const expectedWorldPosition = new Vector2(400, 600);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle negative canvas position correctly', () => {
    const canvasPosition = new Vector2(-100, -200);
    const worldCenter = new Vector2(300, 400);
    const expectedWorldPosition = new Vector2(200, 200);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero canvas position correctly', () => {
    const canvasPosition = new Vector2(0, 0);
    const worldCenter = new Vector2(300, 400);
    const expectedWorldPosition = new Vector2(300, 400);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero world center correctly', () => {
    const canvasPosition = new Vector2(100, 200);
    const worldCenter = new Vector2(0, 0);
    const expectedWorldPosition = new Vector2(100, 200);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle both zero canvas position and world center correctly', () => {
    const canvasPosition = new Vector2(0, 0);
    const worldCenter = new Vector2(0, 0);
    const expectedWorldPosition = new Vector2(0, 0);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });
});
