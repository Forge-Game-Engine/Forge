import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { InputManager } from '../../input/input-manager';
import { Axis2dAction } from '../../input/actions/axis-2d-action';
import { actionResetTypes } from '../../input/constants/action-reset-types';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiInteractableId } from '../components/ui-interactable-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component';
import {
  createUiHitTestEcsSystem,
  uiHitTestSystemOrder,
  uiPointerActionName,
} from './create-ui-hit-test-ecs-system';

function makeWorld(): {
  world: EcsWorld;
  inputManager: InputManager;
  pointerAction: Axis2dAction;
} {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pointerAction = new Axis2dAction(
    uiPointerActionName,
    'ui',
    actionResetTypes.noReset,
  );

  inputManager.addAxis2dActions(pointerAction);
  world.addSystem(createUiHitTestEcsSystem(inputManager), uiHitTestSystemOrder);

  return { world, inputManager, pointerAction };
}

function addCanvas(world: EcsWorld): number {
  const entity = world.createEntity();

  world.addComponent(entity, uiCanvasId, {
    width: 800,
    height: 600,
    devicePixelRatio: 1,
    referenceResolution: new Vector2(800, 600),
    scaleMode: 'constant-pixel',
    isDirty: false,
  });
  world.addComponent(entity, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: Vector2.zero,
  });

  return entity;
}

function addInteractable(
  world: EcsWorld,
  ox: number,
  oy: number,
  w: number,
  h: number,
  options: {
    zIndex?: number;
    enabled?: boolean;
    blocksPointer?: boolean;
    hitPadding?: number;
  } = {},
): number {
  const entity = world.createEntity();
  const resolvedRect = new Rect(new Vector2(ox, oy), new Vector2(w, h));

  // Simple axis-aligned world matrix: translate(ox, oy) * scale(w, h)
  const worldMatrix = Matrix3x3.identity.translate(ox, oy).scale(w, h);

  const transform: UiTransformEcsComponent = {
    anchorMin: Vector2.zero,
    anchorMax: Vector2.one,
    offsetMin: Vector2.zero,
    offsetMax: Vector2.zero,
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: Vector2.one,
    resolvedRect,
    worldMatrix,
  };

  world.addComponent(entity, uiTransformId, transform);
  world.addComponent(entity, uiInteractableId, {
    enabled: options.enabled ?? true,
    blocksPointer: options.blocksPointer ?? true,
    hitPadding: options.hitPadding,
  });

  if (options.zIndex !== undefined) {
    world.addComponent(entity, uiRenderableId, {
      enabled: true,
      renderable: null as never,
      tintColor: null as never,
      borderColor: null as never,
      borderWidth: 0,
      cornerRadius: 0,
      opacity: 1,
      zIndex: options.zIndex,
    });
  }

  return entity;
}

describe('createUiHitTestEcsSystem', () => {
  describe('basic hit testing', () => {
    it('sets hovered to the entity under the pointer', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);
      const elem = addInteractable(world, 100, 100, 200, 100);

      pointerAction.set(150, 150);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBe(elem);
    });

    it('sets hovered to null when pointer is outside all elements', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);

      addInteractable(world, 100, 100, 200, 100);
      pointerAction.set(0, 0);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBeNull();
    });

    it('updates the pointer position on the canvas state', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);

      pointerAction.set(350, 250);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.pointer.x).toBe(350);
      expect(state?.pointer.y).toBe(250);
    });
  });

  describe('z-order resolution', () => {
    it('selects the topmost (highest zIndex) element', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);
      const back = addInteractable(world, 100, 100, 200, 100, { zIndex: 0 });
      const front = addInteractable(world, 100, 100, 200, 100, { zIndex: 1 });

      pointerAction.set(150, 150);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBe(front);
      expect(state?.hovered).not.toBe(back);
    });

    it('stops at the first blocksPointer element', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);

      // blocker on top (z=1), pass-through below (z=0)
      addInteractable(world, 100, 100, 200, 100, {
        zIndex: 0,
        blocksPointer: false,
      });
      const blocker = addInteractable(world, 100, 100, 200, 100, {
        zIndex: 1,
        blocksPointer: true,
      });

      pointerAction.set(150, 150);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBe(blocker);
    });
  });

  describe('disabled interactable', () => {
    it('skips disabled elements', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);

      addInteractable(world, 100, 100, 200, 100, { enabled: false });
      pointerAction.set(150, 150);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBeNull();
    });
  });

  describe('clip rect', () => {
    it('rejects a hit outside the clip rect', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);
      const entity = world.createEntity();

      const resolvedRect = new Rect(new Vector2(0, 0), new Vector2(800, 600));
      const worldMatrix = Matrix3x3.identity.translate(0, 0).scale(800, 600);
      const clipRect = new Rect(new Vector2(0, 0), new Vector2(50, 50));

      world.addComponent(entity, uiTransformId, {
        anchorMin: Vector2.zero,
        anchorMax: Vector2.one,
        offsetMin: Vector2.zero,
        offsetMax: Vector2.zero,
        pivot: new Vector2(0.5, 0.5),
        rotation: 0,
        scale: Vector2.one,
        resolvedRect,
        worldMatrix,
        clipRect,
      });
      world.addComponent(entity, uiInteractableId, {
        enabled: true,
        blocksPointer: true,
      });

      // Point inside the element but outside the clip rect.
      pointerAction.set(100, 100);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBeNull();
    });
  });

  describe('hit padding', () => {
    it('detects a hit within the padded region', () => {
      const { world, pointerAction } = makeWorld();
      const canvas = addCanvas(world);

      // Element at (100, 100), size (200, 100).
      // Point (95, 150) is 5 px to the left, within hitPadding of 10.
      const elem = addInteractable(world, 100, 100, 200, 100, {
        hitPadding: 10,
      });

      pointerAction.set(95, 150);
      world.update();

      const state = world.getComponent(canvas, uiPointerStateId);

      expect(state?.hovered).toBe(elem);
    });
  });

  describe('missing pointer action', () => {
    it('does not throw when pointer action is not registered', () => {
      const world = new EcsWorld();
      const inputManager = new InputManager();

      world.addSystem(
        createUiHitTestEcsSystem(inputManager),
        uiHitTestSystemOrder,
      );

      const canvas = world.createEntity();

      world.addComponent(canvas, uiCanvasId, {
        width: 800,
        height: 600,
        devicePixelRatio: 1,
        referenceResolution: new Vector2(800, 600),
        scaleMode: 'constant-pixel',
        isDirty: false,
      });
      world.addComponent(canvas, uiPointerStateId, {
        hovered: null,
        pressed: null,
        pointer: Vector2.zero,
      });

      expect(() => world.update()).not.toThrow();
    });
  });
});
