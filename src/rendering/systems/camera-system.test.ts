import { beforeEach, describe, expect, it } from 'vitest';
import { CameraSystem } from './camera-system';
import { Entity, World } from '../../ecs';
import { Axis1dAction, Axis2dAction } from '../../input';
import { CameraComponent } from '../components';
import { PositionComponent, Time } from '../../common';

describe('CameraSystem', () => {
  let cameraSystem: CameraSystem;
  let entity: Entity;
  let cameraComponent: CameraComponent;
  let positionComponent: PositionComponent;
  let world: World;
  let time: Time;
  let zoomInput: Axis1dAction;
  let panInput: Axis2dAction;

  beforeEach(() => {
    time = new Time();
    world = new World('test');

    panInput = new Axis2dAction('pan', 'default');
    zoomInput = new Axis1dAction('zoom', 'default');

    cameraSystem = new CameraSystem(time);

    cameraComponent = new CameraComponent({
      panInput,
      zoomInput,
    });
    positionComponent = new PositionComponent();

    entity = new Entity(world, [cameraComponent, positionComponent]);

    world.addEntity(entity);
    world.addSystem(cameraSystem);
  });

  it('should update the camera zoom(out) based on scroll input', () => {
    cameraComponent.minZoom = 0.00001;
    cameraComponent.maxZoom = 10000;

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(0.5);
  });

  it('should update the camera zoom(in) based on scroll input', () => {
    cameraComponent.minZoom = 0.00001;
    cameraComponent.maxZoom = 10000;

    zoomInput.set(-1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(2);
  });

  it('should update the camera zoom(out) when scrolled twice', () => {
    cameraComponent.minZoom = 0.00001;
    cameraComponent.maxZoom = 10000;

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(0.25);
  });

  it('should return to the same position when zooming in and out again', () => {
    cameraComponent.minZoom = 0.00001;
    cameraComponent.maxZoom = 10000;

    zoomInput.set(-1);
    time.update(16.6666);
    world.update();

    zoomInput.set(-1);
    time.update(16.6666);
    world.update();

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(1);
  });

  it('should clamp the camera zoom to the min and max zoom levels', () => {
    zoomInput.set(2000);

    cameraSystem.run(entity);

    expect(cameraComponent.zoom).toBe(cameraComponent.minZoom);

    zoomInput.set(-5000);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(cameraComponent.maxZoom);
  });

  it('should update the camera position based on key inputs', () => {
    panInput.set(50, -30);

    time.update(16.6666);
    world.update();

    expect(positionComponent.local.x).toBeGreaterThan(0);
    expect(positionComponent.local.y).toBeLessThan(0);
  });

  it('should not update the camera if it is static', () => {
    cameraComponent.isStatic = true;
    panInput.set(50, -30);
    zoomInput.set(-5000);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.local.x).toBe(0);
    expect(positionComponent.local.y).toBe(0);
  });
});
