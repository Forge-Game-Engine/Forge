import { beforeEach, describe, expect, it } from 'vitest';
import { CameraSystem } from './camera-system';
import { Entity, World } from '../../ecs';
import { Axis1dAction, Axis2dAction, InputManager } from '../../input';
import { CameraComponent } from '../components';
import { PositionComponent } from '../../common';

describe('CameraSystem', () => {
  let cameraSystem: CameraSystem;
  let entity: Entity;
  let cameraComponent: CameraComponent;
  let positionComponent: PositionComponent;
  let world: World;
  let zoomInput: Axis1dAction;
  let panInput: Axis2dAction;
  let manager: InputManager;

  beforeEach(() => {
    world = new World('test');
    manager = new InputManager();

    panInput = new Axis2dAction('pan', manager);
    zoomInput = new Axis1dAction('zoom', manager);

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

    expect(cameraComponent.zoom).toBe(0.5);
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
    panInput.set(50, -30);

    world.update(16.6666);

    expect(positionComponent.x).toBeGreaterThan(0);
    expect(positionComponent.y).toBeLessThan(0);
  });

  it('should not update the camera if it is static', () => {
    cameraComponent.isStatic = true;
    panInput.set(50, -30);
    zoomInput.set(-5000);

    world.update(16.6666);

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.x).toBe(0);
    expect(positionComponent.y).toBe(0);
  });
});
