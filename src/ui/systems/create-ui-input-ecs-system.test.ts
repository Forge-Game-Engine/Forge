import { describe, expect, it, vi } from 'vitest';

vi.mock('../text/create-ui-text-renderable.js', () => ({
  createUiTextRenderable: vi.fn(() => ({})),
}));

import { EcsWorld } from '../../ecs/ecs-world';
import { HoldAction } from '../../input/actions/hold-action';
import { TriggerAction } from '../../input/actions/trigger-action';
import { InputManager } from '../../input/input-manager';
import { Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { RenderContext } from '../../rendering/render-context';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiStateId } from '../components/ui-state-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from './create-ui-state-ecs-system';
import { createUiInputEcsSystem } from './create-ui-input-ecs-system';
import { createUiInputBox } from '../utilities/create-ui-input-box';
import { registerUiInputActions } from '../utilities/register-ui-input-actions';
import { ParameterizedForgeEvent } from '../../events/index';
import type { FontAsset } from '../text/types/font-asset';
import type { UiTextInputSource } from '../utilities/create-ui-text-input-source';

const mockRenderable = {} as Renderable<UiInstanceComponents>;
const mockRenderContext = {
  gl: {},
  createProgram: vi.fn(),
} as unknown as RenderContext;
const mockFont = {} as unknown as FontAsset;

interface InputWorld {
  world: EcsWorld;
  inputManager: InputManager;
  pressAction: HoldAction;
  activateAction: TriggerAction;
  cancelAction: TriggerAction;
  navLeft: TriggerAction;
  navRight: TriggerAction;
  backspaceAction: TriggerAction;
  deleteAction: TriggerAction;
  homeAction: TriggerAction;
  endAction: TriggerAction;
  canvas: number;
  textInputSource: UiTextInputSource;
}

function makeWorld(): InputWorld {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');
  inputManager.addHoldActions(pressAction);

  const actions = registerUiInputActions(inputManager);

  const onInput = new ParameterizedForgeEvent<string>('textInput');
  const onCompositionComplete = new ParameterizedForgeEvent<string>(
    'composition',
  );

  const textInputSource: UiTextInputSource = {
    onInput,
    onCompositionComplete,
    focus: vi.fn(),
    blur: vi.fn(),
    stop: vi.fn(),
  };

  world.addSystem(createUiStateEcsSystem(inputManager));
  world.addSystem(createUiInputEcsSystem(inputManager, textInputSource));

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
    pointer: new Vector2(0, 0),
  });

  return {
    world,
    inputManager,
    pressAction,
    activateAction: actions.activate,
    cancelAction: actions.cancel,
    navLeft: actions.navigateLeft,
    navRight: actions.navigateRight,
    backspaceAction: actions.inputBackspace,
    deleteAction: actions.inputDelete,
    homeAction: actions.inputHome,
    endAction: actions.inputEnd,
    canvas,
    textInputSource,
  };
}

function focusEntity(world: EcsWorld, canvas: number, entity: number): void {
  const focusComp = world.getComponent(canvas, uiFocusId)!;
  focusComp.focused = entity;
  const stateComp = world.getComponent(entity, uiStateId)!;
  stateComp.focused = true;
  stateComp.onFocus.raise({
    entity,
    pointer: new Vector2(0, 0),
    source: 'keyboard',
  });
}

describe('createUiInputEcsSystem', () => {
  describe('character insertion', () => {
    it('inserts characters from textInputSource.onInput', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
      });

      focusEntity(w.world, w.canvas, entity);
      w.textInputSource.onInput.raise('h');
      w.textInputSource.onInput.raise('i');
      w.world.update();

      expect(input.value).toBe('hi');
    });

    it('does not insert when not focused', () => {
      const w = makeWorld();
      const { input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
      });

      w.textInputSource.onInput.raise('X');
      w.world.update();

      expect(input.value).toBe('');
    });
  });

  describe('arrow key caret movement', () => {
    it('moves caret right on navigateRight', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      input.caretIndex = 0;
      focusEntity(w.world, w.canvas, entity);
      w.navRight.trigger();
      w.world.update();

      expect(input.caretIndex).toBe(1);
    });

    it('moves caret left on navigateLeft', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      focusEntity(w.world, w.canvas, entity);
      w.navLeft.trigger();
      w.world.update();

      expect(input.caretIndex).toBe(4);
    });
  });

  describe('backspace and delete', () => {
    it('deletes char before caret on backspace', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      focusEntity(w.world, w.canvas, entity);
      w.backspaceAction.trigger();
      w.world.update();

      expect(input.value).toBe('hell');
    });

    it('deletes char after caret on delete', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      input.caretIndex = 0;
      focusEntity(w.world, w.canvas, entity);
      w.deleteAction.trigger();
      w.world.update();

      expect(input.value).toBe('ello');
    });
  });

  describe('home and end', () => {
    it('moves caret to start on home', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      focusEntity(w.world, w.canvas, entity);
      w.homeAction.trigger();
      w.world.update();

      expect(input.caretIndex).toBe(0);
    });

    it('moves caret to end on end', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
      });

      input.caretIndex = 0;
      focusEntity(w.world, w.canvas, entity);
      w.endAction.trigger();
      w.world.update();

      expect(input.caretIndex).toBe(5);
    });
  });

  describe('onChange event', () => {
    it('fires onChange when value changes', () => {
      const w = makeWorld();
      const received: string[] = [];
      const { entity } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        onChange: (e) => received.push(e.value),
      });

      focusEntity(w.world, w.canvas, entity);
      w.textInputSource.onInput.raise('a');
      w.world.update();

      expect(received).toEqual(['a']);
    });
  });

  describe('submit', () => {
    it('fires onSubmit on activate in single-line mode', () => {
      const w = makeWorld();
      const submitted: string[] = [];
      const { entity } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
        onSubmit: (e) => submitted.push(e.value),
      });

      focusEntity(w.world, w.canvas, entity);
      w.activateAction.trigger();
      w.world.update();

      expect(submitted).toEqual(['hello']);
    });

    it('inserts newline on activate in multiline mode', () => {
      const w = makeWorld();
      const { entity, input } = createUiInputBox(w.world, {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
        value: 'hello',
        multiline: true,
      });

      focusEntity(w.world, w.canvas, entity);
      w.activateAction.trigger();
      w.world.update();

      expect(input.value).toBe('hello\n');
    });
  });
});
