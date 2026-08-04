import { describe, expect, it } from 'vitest';
import { worldToScreenSpace } from './world-to-screen-space';

describe('worldToScreenSpace', () => {
  it('should convert world position to screen position correctly', () => {
    const worldPosition = { x: 100, y: 200 };
    const cameraPosition = { x: 50, y: 50 };
    const cameraZoom = 2;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 500, y: 600 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle negative world position correctly', () => {
    const worldPosition = { x: -100, y: -200 };
    const cameraPosition = { x: 50, y: 50 };
    const cameraZoom = 2;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 100, y: -200 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero world position correctly', () => {
    const worldPosition = { x: 0, y: 0 };
    const cameraPosition = { x: 50, y: 50 };
    const cameraZoom = 2;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 300, y: 200 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera position correctly', () => {
    const worldPosition = { x: 100, y: 200 };
    const cameraPosition = { x: 0, y: 0 };
    const cameraZoom = 2;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 600, y: 700 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero camera zoom correctly', () => {
    const worldPosition = { x: 100, y: 200 };
    const cameraPosition = { x: 50, y: 50 };
    const cameraZoom = 1;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 450, y: 450 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle zero canvas center correctly', () => {
    const worldPosition = { x: 100, y: 200 };
    const cameraPosition = { x: 50, y: 50 };
    const cameraZoom = 2;
    const canvasCenter = { x: 0, y: 0 };
    const expectedScreenPosition = { x: 100, y: 300 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should handle both zero world position and camera position correctly', () => {
    const worldPosition = { x: 0, y: 0 };
    const cameraPosition = { x: 0, y: 0 };
    const cameraZoom = 2;
    const canvasCenter = { x: 400, y: 300 };
    const expectedScreenPosition = { x: 400, y: 300 };

    const result = worldToScreenSpace(
      worldPosition,
      cameraPosition,
      cameraZoom,
      canvasCenter,
    );

    expect(result).toEqual(expectedScreenPosition);
  });

  it('should scale by pixelsPerUnit in addition to zoom', () => {
    const worldPosition = { x: 10, y: 20 };
    const cameraPosition = { x: 0, y: 0 };
    const cameraZoom = 1;
    const canvasCenter = { x: 400, y: 300 };
    const pixelsPerUnit = 10;
    const expectedScreenPosition = { x: 500, y: 500 };

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
