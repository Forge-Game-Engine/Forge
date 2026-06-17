import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { HoldAction } from '../../input/actions/hold-action';
import { InputManager } from '../../input/input-manager';
import { TriggerAction } from '../../input/actions/trigger-action';
import { Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { uiCheckboxId } from '../components/ui-checkbox-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from '../systems/create-ui-state-ecs-system';
import { createUiKeyboardNavEcsSystem } from '../systems/create-ui-keyboard-nav-ecs-system';
import { createUiCheckbox } from './create-ui-checkbox';
import {
  registerUiInputActions,
  uiInputActionNames,
} from './register-ui-input-actions';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

function makeWorld(): {
  world: EcsWorld;
  pressAction: HoldAction;
  activateAction: TriggerAction;
  canvas: number;
} {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');

  inputManager.addHoldActions(pressAction);
  registerUiInputActions(inputManager);

  let activateAction: TriggerAction;

  try {
    activateAction = inputManager.getTriggerAction(uiInputActionNames.activate);
  } catch {
    activateAction = new TriggerAction(uiInputActionNames.activate, 'ui');
    inputManager.addTriggerActions(activateAction);
  }

  world.addSystem(createUiStateEcsSystem(inputManager));
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
  world.addComponent(canvas, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: new Vector2(0, 0),
  });
  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });

  return { world, pressAction, activateAction, canvas };
}

describe('createUiCheckbox', () => {
  describe('entity assembly', () => {
    it('creates a box entity with required components', () => {
      const world = new EcsWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        rect: { x: 0, y: 0, width: 24, height: 24 },
      });

      expect(world.getComponent(entity, uiTransformId)).toBeTruthy();
      expect(world.getComponent(entity, uiRenderableId)).toBeTruthy();
      expect(world.getComponent(entity, uiStateId)).toBeTruthy();
      expect(world.getComponent(entity, uiCheckboxId)).toBeTruthy();
    });

    it('creates a child check mark entity', () => {
      const world = new EcsWorld();
      const { checkEntity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
      });

      expect(world.getComponent(checkEntity, uiRenderableId)).toBeTruthy();
    });

    it('starts with the initial checked state', () => {
      const world = new EcsWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: true,
      });

      const checkbox = world.getComponent(entity, uiCheckboxId)!;

      expect(checkbox.checked).toBe(true);
    });
  });

  describe('check mark visibility', () => {
    it('check mark is hidden when unchecked', () => {
      const world = new EcsWorld();
      const { checkEntity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
      });

      const checkR = world.getComponent(checkEntity, uiRenderableId)!;

      expect(checkR.opacity).toBe(0);
    });

    it('check mark is visible when checked', () => {
      const world = new EcsWorld();
      const { checkEntity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: true,
      });

      const checkR = world.getComponent(checkEntity, uiRenderableId)!;

      expect(checkR.opacity).toBe(1);
    });
  });

  describe('toggle on click', () => {
    it('toggles checked from false to true on pointer click', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const checkbox = world.getComponent(entity, uiCheckboxId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(checkbox.checked).toBe(true);
    });

    it('toggles checked from true to false on second click', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: true,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const checkbox = world.getComponent(entity, uiCheckboxId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(checkbox.checked).toBe(false);
    });

    it('fires onChange with the new checked state', () => {
      const { world, pressAction, canvas } = makeWorld();
      const changeHandler = vi.fn();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
        onChange: changeHandler,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(changeHandler).toHaveBeenCalledOnce();
      expect(changeHandler.mock.calls[0][0]).toMatchObject({
        entity,
        checked: true,
      });
    });

    it('updates check mark opacity after toggle', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity, checkEntity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const checkR = world.getComponent(checkEntity, uiRenderableId)!;

      expect(checkR.opacity).toBe(0);

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(checkR.opacity).toBe(1);
    });
  });

  describe('keyboard activation', () => {
    it('toggles via ui.activate when focused', () => {
      const { world, activateAction, canvas } = makeWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
      });

      const focus = world.getComponent(canvas, uiFocusId)!;
      const state = world.getComponent(entity, uiStateId)!;
      const checkbox = world.getComponent(entity, uiCheckboxId)!;

      focus.focused = entity;
      state.focused = true;
      activateAction.trigger();
      world.update();

      expect(checkbox.checked).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('does not toggle when disabled', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checked: false,
        disabled: true,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const checkbox = world.getComponent(entity, uiCheckboxId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(checkbox.checked).toBe(false);
    });
  });

  describe('check inset', () => {
    it('applies custom inset to the check entity offsetMin/offsetMax', () => {
      const world = new EcsWorld();
      const { checkEntity } = createUiCheckbox(world, {
        renderable: mockRenderable,
        checkRenderable: mockRenderable,
        checkInset: 6,
      });

      const t = world.getComponent(checkEntity, uiTransformId)!;

      expect(t.offsetMin.x).toBe(6);
      expect(t.offsetMin.y).toBe(6);
      expect(t.offsetMax.x).toBe(-6);
      expect(t.offsetMax.y).toBe(-6);
    });
  });
});
