import { describe, expect, it } from 'vitest';
import { screenToWorldSpace } from './screen-to-world-space';

describe('screenToWorldSpace', () => {
  it.each([
    { description: 'the default camera', cameraZoom: 1 },
    { description: 'the default camera position, zoomed in', cameraZoom: 2 },
    {
      description: 'the default camera position, zoomed out',
      cameraZoom: 0.5,
    },
  ])(
    'should convert screen position to world position correctly with $description and pointer in the center of the screen',
    ({ cameraZoom }) => {
      const screenPosition = { x: 400, y: 300 };
      const cameraPosition = { x: 0, y: 0 };
      const screenWidth = 800;
      const screenHeight = 600;

      const expectedWorldPosition = { x: 0, y: 0 };

      const result = screenToWorldSpace(
        screenPosition,
        cameraPosition,
        cameraZoom,
        screenWidth,
        screenHeight,
      );

      expect(result).toEqual(expectedWorldPosition);
    },
  );

  it('should convert screen position to world position correctly with the default camera and pointer is close to the top-left of the screen', () => {
    const screenPosition = { x: 100, y: 100 };
    const cameraPosition = { x: 0, y: 0 };
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = { x: -300, y: 200 };

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the camera panned and pointer in the center of the screen', () => {
    const screenPosition = { x: 400, y: 300 };
    const cameraPosition = { x: -100, y: -100 };
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = { x: -100, y: -100 };

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the camera panned and pointer below center', () => {
    const screenPosition = { x: 500, y: 400 };
    const cameraPosition = { x: -100, y: -100 };
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = { x: 0, y: -200 };

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it.each([
    {
      description: 'the default camera',
      cameraZoom: 1,
      expected: { x: -400, y: 300 },
    },
    {
      description: 'the default camera, zoomed in',
      cameraZoom: 2,
      expected: { x: -200, y: 150 },
    },
    {
      description: 'the default camera, zoomed out',
      cameraZoom: 0.5,
      expected: { x: -800, y: 600 },
    },
  ])(
    'should convert screen position to world position correctly with $description and pointer exactly in the top-left',
    ({ cameraZoom, expected }) => {
      const screenPosition = { x: 0, y: 0 };
      const cameraPosition = { x: 0, y: 0 };
      const screenWidth = 800;
      const screenHeight = 600;

      const expectedWorldPosition = { x: expected.x, y: expected.y };

      const result = screenToWorldSpace(
        screenPosition,
        cameraPosition,
        cameraZoom,
        screenWidth,
        screenHeight,
      );

      expect(result).toEqual(expectedWorldPosition);
    },
  );

  it('should convert screen position to world position correctly with the camera panned, zoomed in and pointer exactly in the top-left', () => {
    const screenPosition = { x: 0, y: 0 };
    const cameraPosition = { x: 100, y: 100 };
    const cameraZoom = 2;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = { x: -100, y: 250 };

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should scale by pixelsPerUnit in addition to zoom', () => {
    const screenPosition = { x: 500, y: 400 };
    const cameraPosition = { x: 0, y: 0 };
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;
    const pixelsPerUnit = 10;

    const expectedWorldPosition = { x: 10, y: -10 };

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
      pixelsPerUnit,
    );

    expect(result).toEqual(expectedWorldPosition);
  });
});
