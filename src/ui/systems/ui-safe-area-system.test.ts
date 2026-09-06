import { describe, expect, it } from 'vitest';
import { createUiSafeAreaEcsSystem } from './ui-safe-area-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addCameraComponent, RenderContext } from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { addUiSafeAreaComponent } from '../components/ui-safe-area-component.js';

const buildRenderContext = (height: number): RenderContext =>
  ({ height }) as RenderContext;

/** Creates a canvas entity with a camera whose `verticalWorldUnits` is given, so pixels-per-unit is easy to reason about in assertions. */
function createTestCanvas(world: EcsWorld, verticalWorldUnits: number): number {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { verticalWorldUnits });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  return canvas;
}

describe('createUiSafeAreaEcsSystem', () => {
  it('shrinks the rect by the insets on every enabled edge, converted through pixels-per-unit', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1080); // pixelsPerUnit = 1080 / 1080 = 1
    const canvas = createTestCanvas(world, 1080);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(world, entity);
    addUiSafeAreaComponent(world, entity);

    world.addSystem(
      createUiSafeAreaEcsSystem(renderContext, () => ({
        top: 40,
        right: 5,
        bottom: 20,
        left: 5,
      })),
    );
    world.update();

    const rectTransform = world.getComponent(entity, rectTransformId)!;

    expect(rectTransform.x).toEqual({
      kind: 'stretch',
      anchorMin: 0,
      anchorMax: 1,
      pivot: 0,
      margin: -10,
    });
    expect(rectTransform.y).toEqual({
      kind: 'stretch',
      anchorMin: 0,
      anchorMax: 1,
      pivot: 0,
      margin: -60,
    });
    expect(rectTransform.anchoredPosition).toEqual({ x: 5, y: 20 });
  });

  it('ignores a disabled edge, leaving it flush with the parent', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1080);
    const canvas = createTestCanvas(world, 1080);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(world, entity);
    addUiSafeAreaComponent(world, entity, { bottom: false });

    world.addSystem(
      createUiSafeAreaEcsSystem(renderContext, () => ({
        top: 40,
        right: 0,
        bottom: 20,
        left: 0,
      })),
    );
    world.update();

    const rectTransform = world.getComponent(entity, rectTransformId)!;

    expect(rectTransform.y).toEqual({
      kind: 'stretch',
      anchorMin: 0,
      anchorMax: 1,
      pivot: 0,
      margin: -40,
    });
    expect(rectTransform.anchoredPosition).toEqual({ x: 0, y: 0 });
  });

  it('converts insets through a non-1 pixels-per-unit ratio', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1080); // pixelsPerUnit = 1080 / 2160 = 0.5
    const canvas = createTestCanvas(world, 2160);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(world, entity);
    addUiSafeAreaComponent(world, entity);

    world.addSystem(
      createUiSafeAreaEcsSystem(renderContext, () => ({
        top: 20,
        right: 0,
        bottom: 0,
        left: 0,
      })),
    );
    world.update();

    // 20 CSS px / 0.5 pixelsPerUnit = 40 world units
    const { y } = world.getComponent(entity, rectTransformId)!;

    expect(y.kind === 'stretch' && y.margin).toBe(-40);
  });
});
