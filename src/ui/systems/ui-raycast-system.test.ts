import { describe, expect, it } from 'vitest';
import { createUiRaycastEcsSystem } from './ui-raycast-system.js';
import { createUiLayoutEcsSystem } from './ui-layout-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { MouseInputSource } from '../../input/index.js';
import {
  addCameraComponent,
  addSpriteComponent,
  Renderable,
  RenderContext,
} from '../../rendering/index.js';
import {
  addCanvasComponent,
  canvasId,
} from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const buildRenderContext = (width: number, height: number): RenderContext =>
  ({ width, height }) as RenderContext;

const buildRenderable = (category = 1): Renderable =>
  ({ category }) as Renderable;

const buildMouseInputSource = (x: number, y: number): MouseInputSource =>
  ({ position: { x, y } }) as MouseInputSource;

/** Creates a canvas entity with a UI camera, cloning `ui-layout-system.test.ts`'s helper. */
const createTestCanvas = (
  world: EcsWorld,
  cameraOptions: Parameters<typeof addCameraComponent>[2] = {},
): { canvas: number; camera: number } => {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, {
    verticalWorldUnits: 1080,
    ...cameraOptions,
  });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  return { canvas, camera };
};

const createInteractablePanel = (
  world: EcsWorld,
  parent: number,
  sizeOrMargin: { x: number; y: number },
  overrides: Parameters<typeof addUiInteractableComponent>[2] = {},
): number => {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, {
    ...UiAnchor.center,
    sizeOrMargin,
  });
  addUiInteractableComponent(world, entity, overrides);

  return entity;
};

const runRaycast = (
  world: EcsWorld,
  renderContext: RenderContext,
  pointerX: number,
  pointerY: number,
): void => {
  world.addSystem(createUiLayoutEcsSystem(renderContext));
  world.addSystem(
    createUiRaycastEcsSystem(
      buildMouseInputSource(pointerX, pointerY),
      renderContext,
    ),
  );
  world.update();
};

describe('createUiRaycastEcsSystem', () => {
  it('hits an interactable whose rect contains the pointer', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);
    const panel = createInteractablePanel(world, canvas, { x: 300, y: 150 });

    runRaycast(world, renderContext, 960, 540);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBe(panel);
    expect(canvasComponent.isPointerOverUi).toBe(true);
  });

  it('reports no hit when the pointer is outside every interactable rect', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);
    createInteractablePanel(world, canvas, { x: 300, y: 150 });

    runRaycast(world, renderContext, 0, 0);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBeNull();
    expect(canvasComponent.isPointerOverUi).toBe(false);
  });

  it('resolves overlapping interactables to the topmost (last in hierarchy order)', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);
    const back = createInteractablePanel(world, canvas, { x: 400, y: 400 });
    const front = createInteractablePanel(world, canvas, { x: 200, y: 200 });

    runRaycast(world, renderContext, 960, 540);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBe(front);
    expect(canvasComponent.hoveredEntity).not.toBe(back);
  });

  it('lets the pointer pass through an element with blocksRaycasts: false', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);
    const back = createInteractablePanel(world, canvas, { x: 400, y: 400 });
    createInteractablePanel(
      world,
      canvas,
      { x: 200, y: 200 },
      { blocksRaycasts: false },
    );

    runRaycast(world, renderContext, 960, 540);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBe(back);
  });

  it('does not hit an interactable culled from its canvas camera by cullingMask', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world, { cullingMask: 1 << 5 });
    const panel = createInteractablePanel(world, canvas, { x: 300, y: 150 });

    addSpriteComponent(world, panel, {
      width: 1,
      height: 1,
      renderable: buildRenderable(1 << 2),
    });

    runRaycast(world, renderContext, 960, 540);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBeNull();
  });

  it('still hits an interactable whose sprite category matches the cullingMask', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world, { cullingMask: 1 << 5 });
    const panel = createInteractablePanel(world, canvas, { x: 300, y: 150 });

    addSpriteComponent(world, panel, {
      width: 1,
      height: 1,
      renderable: buildRenderable(1 << 5),
    });

    runRaycast(world, renderContext, 960, 540);

    const canvasComponent = world.getComponent(canvas, canvasId)!;

    expect(canvasComponent.hoveredEntity).toBe(panel);
  });
});
