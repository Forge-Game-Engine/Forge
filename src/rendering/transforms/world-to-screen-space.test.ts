import { describe, expect, it } from 'vitest';
import { worldToScreenSpace } from './world-to-screen-space';
import { createVector2 } from '../../math';

describe('worldToScreenSpace', () => {
  it('should convert world position to screen position correctly', () => {
    const worldPosition = createVector2(100, 200);
    const cameraPosition = createVector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(500, 600);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle negative world position correctly', () => {
    const worldPosition = createVector2(-100, -200);
    const cameraPosition = createVector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(100, -200);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero world position correctly', () => {
    const worldPosition = createVector2(0, 0);
    const cameraPosition = createVector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(300, 200);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera position correctly', () => {
    const worldPosition = createVector2(100, 200);
    const cameraPosition = createVector2(0, 0);
    const cameraZoom = 2;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(600, 700);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera zoom correctly', () => {
    const worldPosition = createVector2(100, 200);
    const cameraPosition = createVector2(50, 50);
    const cameraZoom = 1;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(450, 450);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero canvas center correctly', () => {
    const worldPosition = createVector2(100, 200);
    const cameraPosition = createVector2(50, 50);
    const cameraZoom = 2;
    const canvasCenter = createVector2(0, 0);
    const expectedScreenPosition = createVector2(100, 300);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle both zero world position and camera position correctly', () => {
    const worldPosition = createVector2(0, 0);
    const cameraPosition = createVector2(0, 0);
    const cameraZoom = 2;
    const canvasCenter = createVector2(400, 300);
    const expectedScreenPosition = createVector2(400, 300);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should scale by pixelsPerUnit in addition to zoom', () => {
    const worldPosition = createVector2(10, 20);
    const cameraPosition = createVector2(0, 0);
    const cameraZoom = 1;
    const canvasCenter = createVector2(400, 300);
    const pixelsPerUnit = 10;
    const expectedScreenPosition = createVector2(500, 500);

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
      pixelsPerUnit,
    );

    expect(result).toEqual(expectedScreenPosition);
  });
});
