import { describe, expect, it } from 'vitest';
import { canvasToWorldSpace } from './canvas-to-world-space';
import { Vec2 } from '../../math';

describe('canvasToWorldSpace', () => {
  it('should convert canvas position to world position correctly', () => {
    const canvasPosition = Vec2.create(100, 200);
    const worldCenter = Vec2.create(300, 400);
    const expectedWorldPosition = Vec2.create(400, 600);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle negative canvas position correctly', () => {
    const canvasPosition = Vec2.create(-100, -200);
    const worldCenter = Vec2.create(300, 400);
    const expectedWorldPosition = Vec2.create(200, 200);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero canvas position correctly', () => {
    const canvasPosition = Vec2.create(0, 0);
    const worldCenter = Vec2.create(300, 400);
    const expectedWorldPosition = Vec2.create(300, 400);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle zero world center correctly', () => {
    const canvasPosition = Vec2.create(100, 200);
    const worldCenter = Vec2.create(0, 0);
    const expectedWorldPosition = Vec2.create(100, 200);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should handle both zero canvas position and world center correctly', () => {
    const canvasPosition = Vec2.create(0, 0);
    const worldCenter = Vec2.create(0, 0);
    const expectedWorldPosition = Vec2.create(0, 0);

    const result = canvasToWorldSpace(canvasPosition, worldCenter);

    expect(result).toEqual(expectedWorldPosition);
  });
});
