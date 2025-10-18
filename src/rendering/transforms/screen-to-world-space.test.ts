import { describe, expect, it } from 'vitest';
import { screenToWorldSpace } from './screen-to-world-space';
import { Vector2 } from '../../math';

describe('screenToWorldSpace', () => {
  it('should convert screen position to world position correctly with the default camera and pointer in the center of the screen', () => {
    const screenPosition = new Vector2(400, 300);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(0, 0);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera and pointer is close to the top-left of the screen', () => {
    const screenPosition = new Vector2(100, 100);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-300, -200);

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
    const screenPosition = new Vector2(400, 300);
    const cameraPosition = new Vector2(-100, -100);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-100, -100);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the camera panned and pointer is offsetting the pan', () => {
    const screenPosition = new Vector2(500, 400);
    const cameraPosition = new Vector2(-100, -100);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(0, 0);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera position, zoomed in and pointer in the center of the screen', () => {
    const screenPosition = new Vector2(400, 300);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 2;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(0, 0);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera position, zoomed out and pointer in the center of the screen', () => {
    const screenPosition = new Vector2(400, 300);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 0.5;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(0, 0);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera and pointer exactly in the top-left', () => {
    const screenPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 1;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-400, -300);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera, zoomed in and pointer exactly in the top-left', () => {
    const screenPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 2;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-200, -150);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the default camera, zoomed out and pointer exactly in the top-left', () => {
    const screenPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(0, 0);
    const cameraZoom = 0.5;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-800, -600);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });

  it('should convert screen position to world position correctly with the camera panned, zoomed in and pointer exactly in the top-left', () => {
    const screenPosition = new Vector2(0, 0);
    const cameraPosition = new Vector2(100, 100);
    const cameraZoom = 2;
    const screenWidth = 800;
    const screenHeight = 600;

    const expectedWorldPosition = new Vector2(-100, -50);

    const result = screenToWorldSpace(
      screenPosition,
      cameraPosition,
      cameraZoom,
      screenWidth,
      screenHeight,
    );

    expect(result).toEqual(expectedWorldPosition);
  });
});
