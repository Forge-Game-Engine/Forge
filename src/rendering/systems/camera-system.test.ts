import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { CameraSystem } from './camera-system';
import { Entity } from '../../ecs';
import { InputsComponent, keyCodes } from '../../input';
import { CameraComponent } from '../components';
import { PositionComponent, Time } from '../../common';

describe('CameraSystem', () => {
  let inputEntity: Entity;
  let time: Time;
  let cameraSystem: CameraSystem;
  let entity: Entity;
  let inputsComponent: InputsComponent;
  let cameraComponent: CameraComponent;
  let positionComponent: PositionComponent;

  beforeEach(() => {
    inputsComponent = {
      scrollDelta: 0,
      keyPressed: vi.fn(),
    } as unknown as InputsComponent;

    inputEntity = {
      getComponentRequired: vi.fn().mockReturnValue(inputsComponent),
    } as unknown as Entity;

    time = {
      rawDeltaTimeInMilliseconds: 16,
    } as Time;

    cameraSystem = new CameraSystem(inputEntity, time);

    cameraComponent = {
      isStatic: false,
      allowZooming: true,
      allowPanning: true,
      zoom: 1,
      zoomSensitivity: 0.1,
      minZoom: 0.5,
      maxZoom: 2,
      panSensitivity: 0.5,
    } as CameraComponent;

    positionComponent = {
      x: 0,
      y: 0,
    } as PositionComponent;

    entity = {
      getComponentRequired: vi.fn((symbol) => {
        if (symbol === CameraComponent.symbol) {
          return cameraComponent;
        }

        if (symbol === PositionComponent.symbol) {
          return positionComponent;
        }
      }),
    } as unknown as Entity;
  });

  it('should update the camera zoom based on scroll input', () => {
    inputsComponent.scrollDelta = 1;

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(0.9);
  });

  it('should clamp the camera zoom to the min and max zoom levels', () => {
    inputsComponent.scrollDelta = 10;

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(cameraComponent.minZoom);

    inputsComponent.scrollDelta = -20;

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(cameraComponent.maxZoom);
  });

  it('should update the camera position based on key inputs', () => {
    (inputsComponent.keyPressed as Mock).mockImplementation((key) => {
      return key === keyCodes.w || key === keyCodes.d;
    });

    cameraSystem.run(entity);

    expect(positionComponent.y).toBeLessThan(0);
    expect(positionComponent.x).toBeGreaterThan(0);
  });

  it('should not update the camera if it is static', () => {
    cameraComponent.isStatic = true;

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.x).toBe(0);
    expect(positionComponent.y).toBe(0);
  });
});
