import { describe, expect, it } from 'vitest';
import { raycastUiCanvas } from './raycast-ui-canvas.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addCameraComponent,
  addDrawOrderComponent,
  addSpriteComponent,
  Geometry,
  Material,
  Renderable,
  RenderContext,
} from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';

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

describe('raycastUiCanvas', () => {
  it('returns the topmost raycast-blocking element under a viewport position', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);

    addElement(world, canvas);
    const top = addElement(world, canvas);

    addElement(world, canvas, false);

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBe(top);
    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 10, y: 10 }),
    ).toBeNull();
  });

  it("returns null when the canvas's camera can't convert the position", () => {
    const world = new EcsWorld();
    const canvas = world.createEntity();

    addPositionComponent(world, canvas);
    addRectTransformComponent(world, canvas);
    addCanvasComponent(world, canvas, { camera: world.createEntity() });

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBeNull();
  });

  it("ignores another canvas's elements", () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const otherCanvas = buildCanvas(world);

    addElement(world, otherCanvas);

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBeNull();
  });

  it('hits an element raised with a draw order before its later siblings', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const raised = addElement(world, canvas);

    addElement(world, canvas);
    addDrawOrderComponent(world, raised, { order: 1 });

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
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
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
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
      renderable: new Renderable(
        {} as Geometry,
        {} as Material,
        0,
        1,
        () => {},
        () => {},
      ),
    });

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBe(onTopLayer);
  });
});
