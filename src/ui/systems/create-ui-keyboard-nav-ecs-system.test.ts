import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { InputManager } from '../../input/input-manager';
import { HoldAction } from '../../input/actions/hold-action';
import { TriggerAction } from '../../input/actions/trigger-action';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { createUiState, uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import { uiInputActionNames } from '../utilities/register-ui-input-actions';
import { createUiKeyboardNavEcsSystem } from './create-ui-keyboard-nav-ecs-system';

interface TestWorld {
  world: EcsWorld;
  inputManager: InputManager;
  focusNextAction: TriggerAction;
  shiftAction: HoldAction;
  navigateUpAction: TriggerAction;
  navigateDownAction: TriggerAction;
  navigateLeftAction: TriggerAction;
  navigateRightAction: TriggerAction;
  activateAction: TriggerAction;
  cancelAction: TriggerAction;
  canvas: number;
}

function makeWorld(): TestWorld {
  const world = new EcsWorld();
  const inputManager = new InputManager('ui');

  const focusNextAction = new TriggerAction(uiInputActionNames.focusNext, 'ui');
  const shiftAction = new HoldAction(uiInputActionNames.shift, 'ui');
  const navigateUpAction = new TriggerAction(
    uiInputActionNames.navigateUp,
    'ui',
  );
  const navigateDownAction = new TriggerAction(
    uiInputActionNames.navigateDown,
    'ui',
  );
  const navigateLeftAction = new TriggerAction(
    uiInputActionNames.navigateLeft,
    'ui',
  );
  const navigateRightAction = new TriggerAction(
    uiInputActionNames.navigateRight,
    'ui',
  );
  const activateAction = new TriggerAction(uiInputActionNames.activate, 'ui');
  const cancelAction = new TriggerAction(uiInputActionNames.cancel, 'ui');

  inputManager.addTriggerActions(
    focusNextAction,
    navigateUpAction,
    navigateDownAction,
    navigateLeftAction,
    navigateRightAction,
    activateAction,
    cancelAction,
  );
  inputManager.addHoldActions(shiftAction);

  world.addSystem(createUiKeyboardNavEcsSystem(inputManager));

  const canvas = world.createEntity();

  world.addComponent(canvas, uiCanvasId, {
    width: 800,
    height: 600,
    devicePixelRatio: 1,
    referenceResolution: new Vector2(800, 600),
    scaleMode: 'constant-pixel',
    isDirty: false,
  });
  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });
  world.addComponent(canvas, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: Vector2.zero,
  });

  return {
    world,
    inputManager,
    focusNextAction,
    shiftAction,
    navigateUpAction,
    navigateDownAction,
    navigateLeftAction,
    navigateRightAction,
    activateAction,
    cancelAction,
    canvas,
  };
}

function makeElement(
  world: EcsWorld,
  tabIndex: number,
  rect?: { x: number; y: number; w: number; h: number },
): number {
  const entity = world.createEntity();

  world.addComponent(entity, uiStateId, createUiState());
  world.addComponent(entity, uiFocusableId, { tabIndex, focusable: true });

  if (rect) {
    world.addComponent(entity, uiTransformId, {
      anchorMin: Vector2.zero,
      anchorMax: Vector2.one,
      offsetMin: Vector2.zero,
      offsetMax: Vector2.zero,
      pivot: new Vector2(0.5, 0.5),
      rotation: 0,
      scale: Vector2.one,
      resolvedRect: new Rect(
        new Vector2(rect.x, rect.y),
        new Vector2(rect.w, rect.h),
      ),
      worldMatrix: Matrix3x3.identity,
    });
  }

  return entity;
}

describe('createUiKeyboardNavEcsSystem', () => {
  let world: EcsWorld;
  let focusNextAction: TriggerAction;
  let shiftAction: HoldAction;
  let activateAction: TriggerAction;
  let cancelAction: TriggerAction;
  let navigateUpAction: TriggerAction;
  let navigateDownAction: TriggerAction;
  let canvas: number;

  beforeEach(() => {
    ({
      world,
      focusNextAction,
      shiftAction,
      activateAction,
      cancelAction,
      navigateUpAction,
      navigateDownAction,
      canvas,
    } = makeWorld());
  });

  describe('tab order traversal', () => {
    it('focuses the first element when Tab is pressed with nothing focused', () => {
      const elem0 = makeElement(world, 0);

      makeElement(world, 1);

      focusNextAction.trigger();
      world.update();

      const focus = world.getComponent(canvas, uiFocusId);

      expect(focus?.focused).toBe(elem0);
    });

    it('advances focus to the next element', () => {
      const elem0 = makeElement(world, 0);
      const elem1 = makeElement(world, 1);

      // Focus elem0 first.
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem0;
      world.getComponent(elem0, uiStateId)!.focused = true;

      focusNextAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem1);
    });

    it('wraps around from last to first', () => {
      const elem0 = makeElement(world, 0);
      const elem1 = makeElement(world, 1);
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem1;
      world.getComponent(elem1, uiStateId)!.focused = true;

      focusNextAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem0);
    });

    it('moves backwards with Shift+Tab', () => {
      const elem0 = makeElement(world, 0);
      const elem1 = makeElement(world, 1);
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem1;
      world.getComponent(elem1, uiStateId)!.focused = true;

      shiftAction.startHold();
      focusNextAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem0);
    });

    it('wraps backwards from first to last with Shift+Tab', () => {
      const elem0 = makeElement(world, 0);
      const elem1 = makeElement(world, 1);
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem0;
      world.getComponent(elem0, uiStateId)!.focused = true;

      shiftAction.startHold();
      focusNextAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem1);
    });

    it('sets focusRing to true for keyboard navigation', () => {
      makeElement(world, 0);

      focusNextAction.trigger();
      world.update();

      const focus = world.getComponent(canvas, uiFocusId);

      expect(focus?.focusRing).toBe(true);
    });
  });

  describe('activate action', () => {
    it('fires onClick on the focused element', () => {
      const elem = makeElement(world, 0);
      const state = world.getComponent(elem, uiStateId)!;
      const clickHandler = vi.fn();
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem;
      state.focused = true;
      state.onClick.registerListener(clickHandler);

      activateAction.trigger();
      world.update();

      expect(clickHandler).toHaveBeenCalledOnce();
      expect(clickHandler.mock.calls[0][0]).toMatchObject({
        source: 'keyboard',
      });
    });

    it('fires onPressStart and onPressEnd on the focused element', () => {
      const elem = makeElement(world, 0);
      const state = world.getComponent(elem, uiStateId)!;
      const startHandler = vi.fn();
      const endHandler = vi.fn();
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem;
      state.focused = true;
      state.onPressStart.registerListener(startHandler);
      state.onPressEnd.registerListener(endHandler);

      activateAction.trigger();
      world.update();

      expect(startHandler).toHaveBeenCalledOnce();
      expect(endHandler).toHaveBeenCalledOnce();
    });

    it('does not activate a disabled element', () => {
      const elem = makeElement(world, 0);
      const state = world.getComponent(elem, uiStateId)!;
      const clickHandler = vi.fn();
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem;
      state.focused = true;
      state.disabled = true;
      state.onClick.registerListener(clickHandler);

      activateAction.trigger();
      world.update();

      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('does nothing when nothing is focused', () => {
      const elem = makeElement(world, 0);
      const state = world.getComponent(elem, uiStateId)!;
      const clickHandler = vi.fn();

      state.onClick.registerListener(clickHandler);

      activateAction.trigger();
      world.update();

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('cancel action', () => {
    it('clears focus when Escape is pressed', () => {
      const elem = makeElement(world, 0);
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem;
      world.getComponent(elem, uiStateId)!.focused = true;

      cancelAction.trigger();
      world.update();

      expect(focus.focused).toBeNull();
    });
  });

  describe('spatial navigation', () => {
    it('moves focus to nearest element in the up direction', () => {
      // elem0 is below (high y), elem1 is above (low y).
      const elem0 = makeElement(world, 0, { x: 100, y: 300, w: 100, h: 50 });
      const elem1 = makeElement(world, 1, { x: 100, y: 100, w: 100, h: 50 });
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem0;
      world.getComponent(elem0, uiStateId)!.focused = true;

      navigateUpAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem1);
    });

    it('moves focus to nearest element in the down direction', () => {
      const elem0 = makeElement(world, 0, { x: 100, y: 100, w: 100, h: 50 });
      const elem1 = makeElement(world, 1, { x: 100, y: 300, w: 100, h: 50 });
      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = elem0;
      world.getComponent(elem0, uiStateId)!.focused = true;

      navigateDownAction.trigger();
      world.update();

      expect(focus.focused).toBe(elem1);
    });
  });
});
