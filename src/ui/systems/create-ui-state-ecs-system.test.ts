import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { InputManager } from '../../input/input-manager';
import { HoldAction } from '../../input/actions/hold-action';
import { Vector2 } from '../../math/index';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { createUiState, uiStateId } from '../components/ui-state-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from './create-ui-state-ecs-system';

function makeWorld(): {
  world: EcsWorld;
  inputManager: InputManager;
  pressAction: HoldAction;
  canvas: number;
} {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');

  inputManager.addHoldActions(pressAction);
  world.addSystem(createUiStateEcsSystem(inputManager));

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
    pointer: new Vector2(150, 150),
  });
  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });

  return { world, inputManager, pressAction, canvas };
}

function makeElement(world: EcsWorld, focusable = false): number {
  const entity = world.createEntity();

  world.addComponent(entity, uiStateId, createUiState());

  if (focusable) {
    world.addComponent(entity, uiFocusableId, { tabIndex: 0, focusable: true });
  }

  return entity;
}

function setHovered(
  world: EcsWorld,
  canvas: number,
  entity: number | null,
): void {
  const ps = world.getComponent(canvas, uiPointerStateId)!;

  ps.hovered = entity;
}

describe('createUiStateEcsSystem', () => {
  let world: EcsWorld;
  let pressAction: HoldAction;
  let canvas: number;

  beforeEach(() => {
    ({ world, pressAction, canvas } = makeWorld());
  });

  describe('hover transitions', () => {
    it('raises onHoverEnter when pointer enters', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const handler = vi.fn();

      state.onHoverEnter.registerListener(handler);
      setHovered(world, canvas, elem);
      world.update();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0]).toMatchObject({
        entity: elem,
        source: 'pointer',
      });
    });

    it('raises onHoverExit when pointer leaves', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const handler = vi.fn();

      setHovered(world, canvas, elem);
      world.update();

      state.onHoverExit.registerListener(handler);
      setHovered(world, canvas, null);
      world.update();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('sets hovered flag correctly', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;

      setHovered(world, canvas, elem);
      world.update();

      expect(state.hovered).toBe(true);

      setHovered(world, canvas, null);
      world.update();

      expect(state.hovered).toBe(false);
    });

    it('does not raise events when hover is unchanged', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const enterHandler = vi.fn();
      const exitHandler = vi.fn();

      setHovered(world, canvas, elem);
      world.update();

      state.onHoverEnter.registerListener(enterHandler);
      state.onHoverExit.registerListener(exitHandler);

      world.update(); // same hovered state

      expect(enterHandler).not.toHaveBeenCalled();
      expect(exitHandler).not.toHaveBeenCalled();
    });
  });

  describe('press transitions', () => {
    it('raises onPressStart when button is pressed over element', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const handler = vi.fn();

      state.onPressStart.registerListener(handler);
      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      expect(handler).toHaveBeenCalledOnce();
      expect(state.pressed).toBe(true);
    });

    it('raises onPressEnd and onClick when button is released over same element', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const endHandler = vi.fn();
      const clickHandler = vi.fn();

      state.onPressEnd.registerListener(endHandler);
      state.onClick.registerListener(clickHandler);

      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(endHandler).toHaveBeenCalledOnce();
      expect(clickHandler).toHaveBeenCalledOnce();
    });

    it('raises onPressEnd but NOT onClick when released off a different element', () => {
      const elem = makeElement(world);
      const other = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const clickHandler = vi.fn();

      state.onClick.registerListener(clickHandler);

      // Press over elem
      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      // Move pointer to other element, then release
      setHovered(world, canvas, other);
      pressAction.endHold();
      world.update();

      expect(clickHandler).not.toHaveBeenCalled();
      expect(state.pressed).toBe(false);
    });

    it('does not press when pointer is not over element at press time', () => {
      const elem = makeElement(world);
      const other = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;

      // Press over other element, then move to elem
      setHovered(world, canvas, other);
      pressAction.startHold();
      world.update();

      setHovered(world, canvas, elem);
      world.update();

      expect(state.pressed).toBe(false);
    });
  });

  describe('disabled short-circuit', () => {
    it('does not update hover when disabled', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const handler = vi.fn();

      state.disabled = true;
      state.onHoverEnter.registerListener(handler);
      setHovered(world, canvas, elem);
      world.update();

      expect(handler).not.toHaveBeenCalled();
      expect(state.hovered).toBe(false);
    });

    it('does not fire onPressStart when disabled', () => {
      const elem = makeElement(world);
      const state = world.getComponent(elem, uiStateId)!;
      const handler = vi.fn();

      state.disabled = true;
      state.onPressStart.registerListener(handler);
      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('focus on click', () => {
    it('calls setFocus when clicking a focusable element', () => {
      const elem = makeElement(world, true /* focusable */);

      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      const focus = world.getComponent(canvas, uiFocusId);

      expect(focus?.focused).toBe(elem);
    });

    it('does not set focus for non-focusable elements', () => {
      const elem = makeElement(world, false /* not focusable */);

      setHovered(world, canvas, elem);
      pressAction.startHold();
      world.update();

      const focus = world.getComponent(canvas, uiFocusId);

      expect(focus?.focused).toBeNull();
    });
  });

  describe('missing press action', () => {
    it('does not throw when primaryPress action is not registered', () => {
      const world2 = new EcsWorld();
      const inputManager2 = new InputManager();

      world2.addSystem(createUiStateEcsSystem(inputManager2));

      const canvas2 = world2.createEntity();

      world2.addComponent(canvas2, uiCanvasId, {
        width: 800,
        height: 600,
        devicePixelRatio: 1,
        referenceResolution: new Vector2(800, 600),
        scaleMode: 'constant-pixel',
        isDirty: false,
      });
      world2.addComponent(canvas2, uiPointerStateId, {
        hovered: null,
        pressed: null,
        pointer: Vector2.zero,
      });

      const elem = world2.createEntity();

      world2.addComponent(elem, uiStateId, createUiState());

      expect(() => world2.update()).not.toThrow();
    });
  });
});
