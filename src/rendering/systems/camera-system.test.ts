import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { CameraSystem } from './camera-system';
import { Entity, Game, World } from '../../ecs';
import {
  Axis1dAction,
  Axis2dAction,
  InputsComponent,
  keyCodes,
} from '../../input';
import { CameraComponent } from '../components';
import { PositionComponent, Time } from '../../common';
import { Vector2 } from '../../math';

describe('CameraSystem', () => {
  let cameraSystem: CameraSystem;
  let entity: Entity;
  let cameraComponent: CameraComponent;
  let positionComponent: PositionComponent;
  let world: World;
  let zoomInput: Axis1dAction;
  let panInput: Axis2dAction;

  beforeEach(() => {
    world = new World('test');

    panInput = new Axis2dAction('pan');
    zoomInput = new Axis1dAction('zoom');

    cameraSystem = new CameraSystem(world.time);

    cameraComponent = new CameraComponent({
      panInput,
      zoomInput,
    });
    positionComponent = new PositionComponent();

    entity = new Entity('camera', world, [cameraComponent, positionComponent]);

    world.addEntity(entity);
    world.addSystem(cameraSystem);
  });

  it('should update the camera zoom based on scroll input', () => {
    zoomInput.set(100);

    world.update(16.6666);

    expect(cameraComponent.zoom).toBe(0.9);
  });

  it('should clamp the camera zoom to the min and max zoom levels', () => {
    zoomInput.set(2000);

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(cameraComponent.minZoom);

    zoomInput.set(-5000);

    world.update(16.6666);

    expect(cameraComponent.zoom).toBe(cameraComponent.maxZoom);
  });

  it('should update the camera position based on key inputs', () => {
    panInput.set(new Vector2(50, -30));

    world.update(16.6666);

    expect(positionComponent.x).toBeGreaterThan(0);
    expect(positionComponent.y).toBeLessThan(0);
  });

  it('should not update the camera if it is static', () => {
    cameraComponent.isStatic = true;
    panInput.set(new Vector2(50, -30));
    zoomInput.set(-5000);

    world.update(16.6666);

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.x).toBe(0);
    expect(positionComponent.y).toBe(0);
  });
});
