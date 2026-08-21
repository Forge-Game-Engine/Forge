import { describe, expect, it } from 'vitest';
import { resolveCanvasPointerPosition } from './resolve-canvas-pointer-position.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { MouseInputSource } from '../../input/index.js';
import { addCameraComponent, RenderContext } from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';

const buildRenderContext = (width: number, height: number): RenderContext =>
  ({ width, height }) as RenderContext;

const buildMouseInputSource = (x: number, y: number): MouseInputSource =>
  ({ position: { x, y } }) as MouseInputSource;

describe('resolveCanvasPointerPosition', () => {
  it('converts the pointer position into the canvas camera UI world space', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);

    const camera = world.createEntity();
    addPositionComponent(world, camera);
    addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

    const canvasEntity = world.createEntity();
    addPositionComponent(world, canvasEntity);
    addRectTransformComponent(world, canvasEntity);
    const canvas = addCanvasComponent(world, canvasEntity, { camera });

    // Center of the screen should convert to the world origin.
    const center = resolveCanvasPointerPosition(
      world,
      canvas,
      renderContext,
      buildMouseInputSource(960, 540),
    );

    expect(center).toEqual({ x: 0, y: 0 });

    // Top-left of the screen should convert to the top-left of the
    // reference resolution (Y flips from Y-down canvas to Y-up UI world).
    const topLeft = resolveCanvasPointerPosition(
      world,
      canvas,
      renderContext,
      buildMouseInputSource(0, 0),
    );

    expect(topLeft).toEqual({ x: -960, y: 540 });
  });

  it('returns null when the canvas camera entity has no CameraEcsComponent', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);

    const canvasEntity = world.createEntity();
    addPositionComponent(world, canvasEntity);
    addRectTransformComponent(world, canvasEntity);
    const canvas = addCanvasComponent(world, canvasEntity, {
      camera: world.createEntity(),
    });

    const result = resolveCanvasPointerPosition(
      world,
      canvas,
      renderContext,
      buildMouseInputSource(0, 0),
    );

    expect(result).toBeNull();
  });
});
