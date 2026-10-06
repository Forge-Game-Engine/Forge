import { describe, expect, it } from 'vitest';
import { addPositionComponent, PositionEcsComponent } from '../common';
import { EcsWorld } from '../ecs';
import { computeCameraView, getCameraView } from './camera-view';
import { addCameraComponent, CameraEcsComponent, cameraId } from './components';
import { RenderContext } from './render-context';
import { RenderTarget } from './render-target';

const buildRenderContext = (
  cssWidth: number,
  cssHeight: number,
  pixelRatio: number = 1,
): RenderContext =>
  ({
    width: cssWidth * pixelRatio,
    height: cssHeight * pixelRatio,
    cssWidth,
    cssHeight,
    pixelRatio,
  }) as RenderContext;

const buildCamera = (
  overrides: Partial<CameraEcsComponent> = {},
): CameraEcsComponent => {
  const world = new EcsWorld();

  return addCameraComponent(world, world.createEntity(), overrides);
};

const buildPosition = (x: number, y: number): PositionEcsComponent => ({
  local: { x, y },
  world: { x, y },
});

describe('computeCameraView', () => {
  it('shows verticalWorldUnits vertically and follows the canvas aspect horizontally', () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10 }),
      buildPosition(0, 0),
      buildRenderContext(800, 400),
    );

    expect(view.size).toEqual({ x: 20, y: 10 });
    expect(view.bounds).toEqual({
      min: { x: -10, y: -5 },
      max: { x: 10, y: 5 },
    });
    expect(view.pixelsPerUnit).toBe(40);
  });

  it('shows half as much of the world at a zoom of 2', () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10, zoom: 2 }),
      buildPosition(0, 0),
      buildRenderContext(800, 400),
    );

    expect(view.size).toEqual({ x: 10, y: 5 });
    expect(view.bounds).toEqual({
      min: { x: -5, y: -2.5 },
      max: { x: 5, y: 2.5 },
    });
    expect(view.pixelsPerUnit).toBe(80);
  });

  it("centers the view on the camera's world position", () => {
    const position: PositionEcsComponent = {
      local: { x: 0, y: 0 },
      world: { x: 30, y: -12 },
    };

    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10 }),
      position,
      buildRenderContext(400, 400),
    );

    expect(view.bounds).toEqual({
      min: { x: 25, y: -17 },
      max: { x: 35, y: -7 },
    });
  });

  it('follows a portrait canvas', () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10 }),
      buildPosition(0, 0),
      buildRenderContext(300, 600),
    );

    expect(view.size).toEqual({ x: 5, y: 10 });
  });

  it('measures pixels per unit in CSS pixels on a high-DPI canvas', () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10 }),
      buildPosition(0, 0),
      buildRenderContext(800, 400, 2),
    );

    expect(view.size).toEqual({ x: 20, y: 10 });
    expect(view.pixelsPerUnit).toBe(40);
    expect(view.worldToViewport({ x: 10, y: -5 })).toEqual({ x: 800, y: 400 });
  });

  it("lays a render target camera's view out at the canvas's aspect, since the target is presented over the whole canvas", () => {
    const renderTarget = { width: 100, height: 100 } as RenderTarget;

    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10, renderTarget }),
      buildPosition(0, 0),
      buildRenderContext(800, 400),
    );

    expect(view.size).toEqual({ x: 20, y: 10 });
  });

  it("maps the view's corners and center to the canvas's, Y-down", () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 10, zoom: 2 }),
      buildPosition(100, 50),
      buildRenderContext(800, 400),
    );

    expect(view.worldToViewport({ x: 100, y: 50 })).toEqual({
      x: 400,
      y: 200,
    });
    expect(view.worldToViewport(view.bounds.min)).toEqual({ x: 0, y: 400 });
    expect(view.worldToViewport(view.bounds.max)).toEqual({ x: 800, y: 0 });
    expect(view.viewportToWorld({ x: 0, y: 0 })).toEqual({
      x: view.bounds.min.x,
      y: view.bounds.max.y,
    });
  });

  it('round-trips a position through the viewport and back', () => {
    const view = computeCameraView(
      buildCamera({ verticalWorldUnits: 7, zoom: 1.5 }),
      buildPosition(-3, 8),
      buildRenderContext(640, 360, 2),
    );
    const worldPosition = { x: 1.25, y: 6.5 };

    const roundTripped = view.viewportToWorld(
      view.worldToViewport(worldPosition),
    );

    expect(roundTripped.x).toBeCloseTo(worldPosition.x);
    expect(roundTripped.y).toBeCloseTo(worldPosition.y);
  });

  it('converts a position on one camera to the matching position on another', () => {
    const renderContext = buildRenderContext(800, 400);
    const gameView = computeCameraView(
      buildCamera({ verticalWorldUnits: 10 }),
      buildPosition(5, 0),
      renderContext,
    );
    const hudView = computeCameraView(
      buildCamera({ verticalWorldUnits: 1080 }),
      buildPosition(0, 0),
      renderContext,
    );

    const onHud = hudView.viewportToWorld(
      gameView.worldToViewport({ x: 5, y: 5 }),
    );

    expect(onHud.x).toBeCloseTo(0);
    expect(onHud.y).toBeCloseTo(540);
  });

  it('returns new vectors without mutating its input', () => {
    const view = computeCameraView(
      buildCamera(),
      buildPosition(0, 0),
      buildRenderContext(800, 400),
    );
    const worldPosition = { x: 1, y: 2 };

    const viewportPosition = view.worldToViewport(worldPosition);

    expect(viewportPosition).not.toBe(worldPosition);
    expect(worldPosition).toEqual({ x: 1, y: 2 });
  });

  it.each([
    { description: 'verticalWorldUnits', camera: { verticalWorldUnits: 0 } },
    { description: 'zoom', camera: { zoom: 0 } },
  ])('throws for a non-positive $description', ({ camera }) => {
    expect(() =>
      computeCameraView(
        buildCamera(camera),
        buildPosition(0, 0),
        buildRenderContext(800, 400),
      ),
    ).toThrow(/must be a positive number/);
  });

  it('throws for a canvas with no area', () => {
    expect(() =>
      computeCameraView(
        buildCamera(),
        buildPosition(0, 0),
        buildRenderContext(0, 400),
      ),
    ).toThrow(/must be a positive number/);
  });
});

describe('getCameraView', () => {
  it("computes the view from the entity's camera and position", () => {
    const world = new EcsWorld();
    const camera = world.createEntity();

    addPositionComponent(world, camera, { local: { x: 4, y: 2 } });
    addCameraComponent(world, camera, { verticalWorldUnits: 10 });

    const view = getCameraView(world, camera, buildRenderContext(400, 400));

    expect(view.bounds).toEqual({
      min: { x: -1, y: -3 },
      max: { x: 9, y: 7 },
    });
  });

  it('throws for an entity with no camera component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(() =>
      getCameraView(world, entity, buildRenderContext(400, 400)),
    ).toThrow(/needs both a camera and a position component/);
  });

  it('throws for a camera with no position component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addCameraComponent(world, entity);

    expect(world.getComponent(entity, cameraId)).not.toBeNull();
    expect(() =>
      getCameraView(world, entity, buildRenderContext(400, 400)),
    ).toThrow(/needs both a camera and a position component/);
  });
});
