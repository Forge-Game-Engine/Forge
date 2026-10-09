import { describe, expect, it } from 'vitest';
import { raycastUiCanvas } from './raycast-ui-canvas.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld, QueryMatches } from '../../ecs/index.js';
import {
  addCameraComponent,
  addDrawOrderComponent,
  addMaskComponent,
  addSpriteComponent,
  RenderContext,
  Texture,
} from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';

const renderContext = {
  width: 800,
  height: 600,
  cssWidth: 800,
  cssHeight: 600,
  pixelRatio: 1,
} as RenderContext;

function buildCanvas(world: EcsWorld): number {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { verticalWorldUnits: 600 });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  return canvas;
}

function addElement(
  world: EcsWorld,
  parent: number,
  blocksRaycasts = true,
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  world.setParent(entity, parent);
  addRectTransformComponent(world, entity, {
    rect: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } },
  });
  addUiInteractableComponent(world, entity, { blocksRaycasts });

  return entity;
}

const queryInteractables = (
  world: EcsWorld,
): QueryMatches<[UiInteractableEcsComponent, RectTransformEcsComponent]> =>
  world.query([uiInteractableId, rectTransformId]);

describe('raycastUiCanvas', () => {
  it('skips the part of an element an ancestor rect mask clips away', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const viewport = world.createEntity();

    addPositionComponent(world, viewport);
    world.setParent(viewport, canvas);
    addRectTransformComponent(world, viewport, {
      rect: { min: { x: -50, y: 0 }, max: { x: 50, y: 50 } },
    });
    addMaskComponent(world, viewport, { width: 100, height: 50 });

    const item = addElement(world, viewport);

    // Canvas (400, 280) is world (0, 20): inside the mask.
    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 280 },
        queryInteractables(world),
      ),
    ).toBe(item);
    // Canvas (400, 320) is world (0, -20): on the item, but clipped.
    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 320 },
        queryInteractables(world),
      ),
    ).toBeNull();
  });

  it('ignores linear and radial masks', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const item = addElement(world, canvas);

    addMaskComponent(world, item, {
      width: 100,
      height: 100,
      shape: { kind: 'linear', origin: 'left', amount: 0 },
    });

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBe(item);
  });

  it('returns the topmost raycast-blocking element under a viewport position', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);

    addElement(world, canvas);
    const top = addElement(world, canvas);

    addElement(world, canvas, false);

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBe(top);
    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 10, y: 10 },
        queryInteractables(world),
      ),
    ).toBeNull();
  });

  it("returns null when the canvas's camera can't convert the position", () => {
    const world = new EcsWorld();
    const canvas = world.createEntity();

    addPositionComponent(world, canvas);
    addRectTransformComponent(world, canvas);
    addCanvasComponent(world, canvas, { camera: world.createEntity() });

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBeNull();
  });

  it("ignores another canvas's elements", () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const otherCanvas = buildCanvas(world);

    addElement(world, otherCanvas);

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBeNull();
  });

  it('hits an element raised with a draw order before its later siblings', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const raised = addElement(world, canvas);

    addElement(world, canvas);
    addDrawOrderComponent(world, raised, { order: 1 });

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBe(raised);
  });

  it("hits a child after its parent, and orders a subtree by its root's draw order", () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const window = addElement(world, canvas);
    const button = addElement(world, window);

    addElement(world, canvas);
    addDrawOrderComponent(world, window, { order: 1 });

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBe(button);
  });

  it("hits by the layer of an element's own sprite, and an invisible hit region as layer 0", () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const onTopLayer = addElement(world, canvas);

    addElement(world, canvas);
    addSpriteComponent(world, onTopLayer, {
      width: 1,
      height: 1,
      layer: 1,
      texture: {} as Texture,
    });

    expect(
      raycastUiCanvas(
        world,
        canvas,
        renderContext,
        { x: 400, y: 300 },
        queryInteractables(world),
      ),
    ).toBe(onTopLayer);
  });
});
