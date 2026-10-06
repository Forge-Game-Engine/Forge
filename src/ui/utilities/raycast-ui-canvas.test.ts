import { describe, expect, it } from 'vitest';
import { raycastUiCanvas } from './raycast-ui-canvas.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addCameraComponent, RenderContext } from '../../rendering/index.js';
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
  canvas: number,
  sortDepth: number,
  blocksRaycasts = true,
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent: canvas });
  addRectTransformComponent(world, entity, {
    rect: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } },
    sortDepth,
  });
  addUiInteractableComponent(world, entity, { blocksRaycasts });

  return entity;
}

describe('raycastUiCanvas', () => {
  it('returns the topmost raycast-blocking element under a viewport position', () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);

    addElement(world, canvas, 1);
    const top = addElement(world, canvas, 2);

    addElement(world, canvas, 3, false);

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBe(top);
    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 10, y: 10 }),
    ).toBeNull();
  });

  it("ignores another canvas's elements", () => {
    const world = new EcsWorld();
    const canvas = buildCanvas(world);
    const otherCanvas = buildCanvas(world);

    addElement(world, otherCanvas, 1);

    expect(
      raycastUiCanvas(world, canvas, renderContext, { x: 400, y: 300 }),
    ).toBeNull();
  });
});
