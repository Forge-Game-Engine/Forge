import { beforeEach, describe, expect, it } from 'vitest';
import { createCameraEcsSystem } from './camera-system';
import { Axis1dAction, Axis2dAction } from '../../input';
import { addCameraComponent } from '../components';
import { addPositionComponent, Time } from '../../common';
import { EcsWorld } from '../../ecs';

describe('CameraSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let zoomInput: Axis1dAction;
  let panInput: Axis2dAction;

  beforeEach(() => {
    time = new Time();
    world = new EcsWorld();

    panInput = new Axis2dAction('pan', 'default');
    zoomInput = new Axis1dAction('zoom', 'default');

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

    zoomInput.set(1);
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

    zoomInput.set(-1);
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

    zoomInput.set(1);
    time.update(16.6666);
    world.update();

    zoomInput.set(1);
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
    const entity = world.createEntity();

    const cameraComponent = addCameraComponent(world, entity, {
      zoomInput,
      panInput,
      minZoom: 0.000001,
      maxZoom: 10000,
    });

    addPositionComponent(world, entity);

    zoomInput.set(2000);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(cameraComponent.minZoom);

    zoomInput.set(-5000);

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

    panInput.set(50, -30);

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

    panInput.set(50, -30);
    zoomInput.set(-5000);

    time.update(16.6666);
    world.update();

    expect(cameraComponent.zoom).toBe(1);
    expect(positionComponent.local.x).toBe(0);
    expect(positionComponent.local.y).toBe(0);
  });
});
