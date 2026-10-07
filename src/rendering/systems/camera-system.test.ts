import { beforeEach, describe, expect, it } from 'vitest';
import { createCameraEcsSystem } from './camera-system';
import { Axis1dAction, Axis2dAction, InputManager } from '../../input';
import { addCameraComponent } from '../components';
import { addPositionComponent, Time } from '../../common';
import { EcsWorld } from '../../ecs';

describe('CameraSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let zoomInput: Axis1dAction;
  let panInput: Axis2dAction;
  let inputManager: InputManager;

  const testSource = { name: 'test' };

  beforeEach(() => {
    time = new Time();
    world = new EcsWorld();

    panInput = new Axis2dAction('pan', 'default');
    zoomInput = new Axis1dAction('zoom', 'default');
    inputManager = new InputManager('default');
    inputManager.addAxis1dActions(zoomInput);
    inputManager.addAxis2dActions(panInput);

    world.addSystem(createCameraEcsSystem(time));
  });

  it('should update the camera zoom(out) based on scroll input', () => {
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    addPositionComponent(world, entity);

    inputManager.setAxis1dInput(testSource, zoomInput, 1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBeCloseTo(0.9090909090909091);
  });

  it('should update the camera zoom(in) based on scroll input', () => {
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    addPositionComponent(world, entity);

    inputManager.setAxis1dInput(testSource, zoomInput, -1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBeCloseTo(1.1);
  });

  it('should update the camera zoom(out) when scrolled twice', () => {
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    addPositionComponent(world, entity);

    inputManager.setAxis1dInput(testSource, zoomInput, 1);
    time.update(16.6666);
    world.update();

    inputManager.setAxis1dInput(testSource, zoomInput, 1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBeCloseTo(0.8264462809917354);
  });

  it('should return to the same position when zooming in and out again', () => {
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    addPositionComponent(world, entity);

    inputManager.setAxis1dInput(testSource, zoomInput, -1);
    time.update(16.6666);
    world.update();

    inputManager.setAxis1dInput(testSource, zoomInput, -1);
    time.update(16.6666);
    world.update();

    inputManager.setAxis1dInput(testSource, zoomInput, 1);
    time.update(16.6666);
    world.update();

    inputManager.setAxis1dInput(testSource, zoomInput, 1);
    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(1);
  });

  it('should clamp the camera zoom to the min and max zoom levels', () => {
    const entity = world.createEntity();

    // A full-strength zoom input scales the zoom by the default sensitivity
    // of 0.1 per frame (by ~0.91 one way, 1.1 the other), so these bounds
    // are tight enough for a single frame of input to cross each of them:
    // 1 -> ~0.91, clamped to 0.95, then 0.95 -> 1.045, clamped to 1.
    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.95,
      maxZoom: 1,
    });

    addPositionComponent(world, entity);

    inputManager.setAxis1dInput(testSource, zoomInput, 1);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(cameraComponent.minZoom);

    inputManager.setAxis1dInput(testSource, zoomInput, -1);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(cameraComponent.maxZoom);
  });

  it('should update the camera position based on key inputs', () => {
    const entity = world.createEntity();

    addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    const positionComponent = addPositionComponent(world, entity);

    inputManager.setAxis2dInput(testSource, panInput, 50, -30);

    time.update(16.6666);
    world.update();

    expect(positionComponent.local.x).toBeGreaterThan(0);
    expect(positionComponent.local.y).toBeLessThan(0);
  });

  it('should not update the camera if it is static', () => {
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      isStatic: true,
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    const positionComponent = addPositionComponent(world, entity);

    inputManager.setAxis2dInput(testSource, panInput, 50, -30);
    inputManager.setAxis1dInput(testSource, zoomInput, -5000);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.local.x).toBe(0);
    expect(positionComponent.local.y).toBe(0);
  });
});
