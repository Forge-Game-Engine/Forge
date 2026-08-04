import { describe, expect, it } from 'vitest';
import { screenToWorldSpace } from './screen-to-world-space';
import { Vec2 } from '../../math';

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
      const screenPosition = Vec2.create(400, 300);
      const cameraPosition = Vec2.create(0, 0);
      const screenWidth = 800;
      const screenHeight = 600;

      const expectedWorldPosition = Vec2.create(0, 0);

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
    const screenPosition = Vec2.create(100, 100);
    const cameraPosition = Vec2.create(0, 0);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = Vec2.create(-300, 200);

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
    const screenPosition = Vec2.create(400, 300);
    const cameraPosition = Vec2.create(-100, -100);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = Vec2.create(-100, -100);

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
    const screenPosition = Vec2.create(500, 400);
    const cameraPosition = Vec2.create(-100, -100);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = Vec2.create(0, -200);

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
      const screenPosition = Vec2.create(0, 0);
      const cameraPosition = Vec2.create(0, 0);
      const screenWidth = 800;
      const screenHeight = 600;

      const expectedWorldPosition = Vec2.create(expected.x, expected.y);

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
    const screenPosition = Vec2.create(0, 0);
    const cameraPosition = Vec2.create(100, 100);
    const cameraZoom = 2;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = Vec2.create(-100, 250);

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
    const screenPosition = Vec2.create(500, 400);
    const cameraPosition = Vec2.create(0, 0);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;
    const pixelsPerUnit = 10;

    const expectedWorldPosition = Vec2.create(10, -10);

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
