import { describe, expect, it } from 'vitest';
import { worldToScreenSpace } from './world-to-screen-space';
import { Vector2 } from 'forge/math';

describe('worldToScreenSpace', () => {
  it('should convert world position to screen position correctly', () => {
    const worldPosition = new Vector2(100, 200);
    const cameraPosition = new Vector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(500, 600);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle negative world position correctly', () => {
    const worldPosition = new Vector2(-100, -200);
    const cameraPosition = new Vector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(100, -200);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero world position correctly', () => {
    const worldPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(300, 200);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera position correctly', () => {
    const worldPosition = new Vector2(100, 200);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(600, 700);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera zoom correctly', () => {
    const worldPosition = new Vector2(100, 200);
    const cameraPosition = new Vector2(50, 50);
    const cameraZoom = 1;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(450, 450);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero canvas center correctly', () => {
    const worldPosition = new Vector2(100, 200);
    const cameraPosition = new Vector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(0, 0);
    const expectedScreenPosition = new Vector2(100, 300);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle both zero world position and camera position correctly', () => {
    const worldPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 2;
    const canvasCenter = new Vector2(400, 300);
    const expectedScreenPosition = new Vector2(400, 300);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });
});
