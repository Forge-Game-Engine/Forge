import { describe, expect, it, vi } from 'vitest';

// Intercept the WebGL text renderable so button tests don't need a real GL context.
vi.mock('../text/create-ui-text-renderable.js', () => ({
  createUiTextRenderable: vi.fn(() => ({})),
}));

import { EcsWorld } from '../../ecs/ecs-world';
import { HoldAction } from '../../input/actions/hold-action';
import { InputManager } from '../../input/input-manager';
import { Vector2 } from '../../math/index';
import { Color } from '../../rendering/color';
import { Renderable } from '../../rendering/renderable';
import { RenderContext } from '../../rendering/render-context';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiInteractableId } from '../components/ui-interactable-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import { uiTextId } from '../text/ui-text-ecs-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from '../systems/create-ui-state-ecs-system';
import { createUiKeyboardNavEcsSystem } from '../systems/create-ui-keyboard-nav-ecs-system';
import { createUiButton } from './create-ui-button';
import { FontAsset } from '../text/types/font-asset';
import { registerUiInputActions } from './register-ui-input-actions';
import { TriggerAction } from '../../input/actions/trigger-action';
import { uiInputActionNames } from './register-ui-input-actions';

const mockRenderable = {} as Renderable<UiInstanceComponents>;
const mockRenderContext = {} as RenderContext;
const mockFont = {} as FontAsset;

function makeWorld(): {
  world: EcsWorld;
  inputManager: InputManager;
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

  return { world, inputManager, pressAction, activateAction, canvas };
}

describe('createUiButton', () => {
  describe('entity assembly', () => {
    it('creates a root entity with transform, renderable, interactable, state, focusable', () => {
      const world = new EcsWorld();
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 120, height: 40 },
      });

      expect(world.getComponent(entity, uiTransformId)).toBeTruthy();
      expect(world.getComponent(entity, uiRenderableId)).toBeTruthy();
      expect(world.getComponent(entity, uiInteractableId)).toBeTruthy();
      expect(world.getComponent(entity, uiStateId)).toBeTruthy();
      expect(world.getComponent(entity, uiFocusableId)).toBeTruthy();
    });

    it('creates a label child entity', () => {
      const world = new EcsWorld();
      const { labelEntity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
      });

      expect(world.getComponent(labelEntity, uiTextId)).toBeTruthy();
    });

    it('applies rect to the transform', () => {
      const world = new EcsWorld();
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 50, y: 100, width: 200, height: 60 },
      });

      const t = world.getComponent(entity, uiTransformId)!;

      expect(t.offsetMin.x).toBe(50);
      expect(t.offsetMin.y).toBe(100);
      expect(t.offsetMax.x).toBe(250);
      expect(t.offsetMax.y).toBe(160);
    });

    it('starts with the label text provided', () => {
      const world = new EcsWorld();
      const { labelEntity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        label: 'Click me',
      });

      const textComp = world.getComponent(labelEntity, uiTextId)!;

      expect(textComp.text).toBe('Click me');
    });

    it('is disabled when disabled option is true', () => {
      const world = new EcsWorld();
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        disabled: true,
      });

      const state = world.getComponent(entity, uiStateId)!;
      const interactable = world.getComponent(entity, uiInteractableId)!;

      expect(state.disabled).toBe(true);
      expect(interactable.enabled).toBe(false);
    });
  });

  describe('setLabel', () => {
    it('updates the label text and marks it dirty', () => {
      const world = new EcsWorld();
      const { labelEntity, setLabel } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        label: 'Old label',
      });

      setLabel('New label');

      const textComp = world.getComponent(labelEntity, uiTextId)!;

      expect(textComp.text).toBe('New label');
      expect(textComp.dirty).toBe(true);
    });
  });

  describe('click handling', () => {
    it('fires the onClick callback on pointer click', () => {
      const { world, pressAction, canvas } = makeWorld();
      const clickHandler = vi.fn();

      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        onClick: clickHandler,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(clickHandler).toHaveBeenCalledOnce();
    });

    it('exposes onClick via state for direct subscription', () => {
      const { world, pressAction, canvas } = makeWorld();
      const clickHandler = vi.fn();

      const { entity, state } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
      });

      state.onClick.registerListener(clickHandler);

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(clickHandler).toHaveBeenCalledOnce();
    });

    it('does not click when pointer is released off the button', () => {
      const { world, pressAction, canvas } = makeWorld();
      const clickHandler = vi.fn();

      const { entity, state } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
      });

      state.onClick.registerListener(clickHandler);

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      ps.hovered = null;
      pressAction.endHold();
      world.update();

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('keyboard activation', () => {
    it('fires onClick via ui.activate when focused', () => {
      const { world, canvas, activateAction } = makeWorld();
      const clickHandler = vi.fn();

      const { entity, state } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
      });

      state.onClick.registerListener(clickHandler);

      const focus = world.getComponent(canvas, uiFocusId)!;

      focus.focused = entity;
      state.focused = true;
      activateAction.trigger();
      world.update();

      expect(clickHandler).toHaveBeenCalledOnce();
      expect((clickHandler.mock.calls[0][0] as { source: string }).source).toBe(
        'keyboard',
      );
    });
  });

  describe('state style transitions', () => {
    it('applies hover style on hover enter', () => {
      const world = new EcsWorld();
      const hoverTint = new Color(0.8, 0.8, 0.8);
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        tintColor: Color.white,
        stateStyles: { hover: { tintColor: hoverTint } },
      });

      const state = world.getComponent(entity, uiStateId)!;
      const r = world.getComponent(entity, uiRenderableId)!;

      state.hovered = true;
      state.onHoverEnter.raise({
        entity,
        pointer: Vector2.zero,
        source: 'pointer',
      });

      expect(r.tintColor).toBe(hoverTint);
    });

    it('restores base style on hover exit', () => {
      const world = new EcsWorld();
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        tintColor: Color.white,
        stateStyles: { hover: { tintColor: new Color(0.8, 0.8, 0.8) } },
      });

      const state = world.getComponent(entity, uiStateId)!;
      const r = world.getComponent(entity, uiRenderableId)!;

      state.hovered = true;
      state.onHoverEnter.raise({
        entity,
        pointer: Vector2.zero,
        source: 'pointer',
      });

      state.hovered = false;
      state.onHoverExit.raise({
        entity,
        pointer: Vector2.zero,
        source: 'pointer',
      });

      expect(r.tintColor).toBe(Color.white);
    });

    it('sets blocksPointer to false for disabled buttons', () => {
      const world = new EcsWorld();
      const { entity } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        disabled: true,
      });

      const interactable = world.getComponent(entity, uiInteractableId)!;

      expect(interactable.blocksPointer).toBe(false);
    });
  });

  describe('toggle mode', () => {
    it('latches pressed state on first click', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity, state, isToggled } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        toggle: true,
      });

      expect(isToggled()).toBe(false);

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      ps.hovered = entity;
      pressAction.startHold();
      world.update();

      pressAction.endHold();
      world.update();

      expect(isToggled()).toBe(true);
      expect(state.pressed).toBe(true);
    });

    it('releases toggle on second click', () => {
      const { world, pressAction, canvas } = makeWorld();
      const { entity, state, isToggled } = createUiButton(world, {
        renderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        toggle: true,
      });

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      // First click: toggle on
      ps.hovered = entity;
      pressAction.startHold();
      world.update();
      pressAction.endHold();
      world.update();

      // Second click: toggle off
      pressAction.startHold();
      world.update();
      pressAction.endHold();
      world.update();

      expect(isToggled()).toBe(false);
      expect(state.pressed).toBe(false);
    });
  });
});
