import { describe, expect, it, vi } from 'vitest';

vi.mock('../text/create-ui-text-renderable.js', () => ({
  createUiTextRenderable: vi.fn(() => ({})),
}));

import { EcsWorld } from '../../ecs/ecs-world';
import { HoldAction } from '../../input/actions/hold-action';
import { InputManager } from '../../input/input-manager';
import { Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { RenderContext } from '../../rendering/render-context';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiInputId } from '../components/ui-input-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from '../systems/create-ui-state-ecs-system';
import { createUiInputBox } from './create-ui-input-box';
import { registerUiInputActions } from './register-ui-input-actions';
import type { FontAsset } from '../text/types/font-asset';
import type { UiTextInputSource } from './create-ui-text-input-source';

const mockRenderable = {} as Renderable<UiInstanceComponents>;
const mockRenderContext = {
  gl: {},
  createProgram: vi.fn(),
  createShader: vi.fn(),
} as unknown as RenderContext;

const mockFont = {} as unknown as FontAsset;

function makeWorld(): {
  world: EcsWorld;
  pressAction: HoldAction;
  canvas: number;
} {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');
  inputManager.addHoldActions(pressAction);
  registerUiInputActions(inputManager);

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

  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });

  world.addComponent(canvas, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: new Vector2(0, 0),
  });

  return { world, pressAction, canvas };
}

describe('createUiInputBox', () => {
  it('creates root entity with required components', () => {
    const { world } = makeWorld();
    const { entity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    expect(world.getComponent(entity, uiStateId)).toBeTruthy();
    expect(world.getComponent(entity, uiInputId)).toBeTruthy();
    expect(world.getComponent(entity, uiTransformId)).toBeTruthy();
  });

  it('attaches UiInputEcsComponent with initial value', () => {
    const { world } = makeWorld();
    const { input } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
      value: 'hello',
    });

    expect(input.value).toBe('hello');
    expect(input.caretIndex).toBe(5);
    expect(input.selectionAnchor).toBeNull();
  });

  it('caret is initially hidden', () => {
    const { world } = makeWorld();
    const { caretEntity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    const caretRenderable = world.getComponent(caretEntity, uiRenderableId);
    expect(caretRenderable?.enabled).toBe(false);
  });

  it('selection is initially hidden', () => {
    const { world } = makeWorld();
    const { selectionEntity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    const selRenderable = world.getComponent(selectionEntity, uiRenderableId);
    expect(selRenderable?.enabled).toBe(false);
  });

  it('enables caret when state is focused', () => {
    const { world } = makeWorld();
    const { entity, caretEntity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    // Manually trigger focus
    const stateComp = world.getComponent(entity, uiStateId)!;
    stateComp.focused = true;
    stateComp.onFocus.raise({
      entity,
      pointer: new Vector2(0, 0),
      source: 'keyboard',
    });

    const caretRenderable = world.getComponent(caretEntity, uiRenderableId);
    expect(caretRenderable?.enabled).toBe(true);
  });

  it('hides caret on blur', () => {
    const { world } = makeWorld();
    const { entity, caretEntity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    const stateComp = world.getComponent(entity, uiStateId)!;

    // Focus
    stateComp.focused = true;
    stateComp.onFocus.raise({
      entity,
      pointer: new Vector2(0, 0),
      source: 'keyboard',
    });

    // Blur
    stateComp.focused = false;
    stateComp.onBlur.raise({
      entity,
      pointer: new Vector2(0, 0),
      source: 'keyboard',
    });

    const caretRenderable = world.getComponent(caretEntity, uiRenderableId);
    expect(caretRenderable?.enabled).toBe(false);
  });

  it('registers onChange listener', () => {
    const { world } = makeWorld();
    const received: string[] = [];

    const { input } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
      onChange: (e) => received.push(e.value),
    });

    input.onChange.raise({ entity: 0, value: 'test' });
    expect(received).toEqual(['test']);
  });

  it('registers onSubmit listener', () => {
    const { world } = makeWorld();
    const received: string[] = [];

    const { input } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
      onSubmit: (e) => received.push(e.value),
    });

    input.onSubmit.raise({ entity: 0, value: 'submitted' });
    expect(received).toEqual(['submitted']);
  });

  it('calls textInputSource.focus when focused', () => {
    const { world } = makeWorld();
    const source: UiTextInputSource = {
      focus: vi.fn(),
      blur: vi.fn(),
      stop: vi.fn(),
      onInput: {
        registerListener: vi.fn(),
      } as unknown as UiTextInputSource['onInput'],
      onCompositionComplete: {
        registerListener: vi.fn(),
      } as unknown as UiTextInputSource['onCompositionComplete'],
    };

    const { entity } = createUiInputBox(world, {
      renderable: mockRenderable,
      caretRenderable: mockRenderable,
      selectionRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      rect: { x: 0, y: 0, width: 200, height: 32 },
      value: 'test',
      textInputSource: source,
    });

    const stateComp = world.getComponent(entity, uiStateId)!;
    stateComp.onFocus.raise({
      entity,
      pointer: new Vector2(0, 0),
      source: 'keyboard',
    });

    expect(source.focus).toHaveBeenCalledWith('test', 4);
  });

  it('destroy removes all entities', () => {
    const { world } = makeWorld();
    const { entity, caretEntity, selectionEntity, destroy } = createUiInputBox(
      world,
      {
        renderable: mockRenderable,
        caretRenderable: mockRenderable,
        selectionRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        rect: { x: 0, y: 0, width: 200, height: 32 },
      },
    );

    destroy();

    expect(world.getComponent(entity, uiInputId)).toBeNull();
    expect(world.getComponent(caretEntity, uiRenderableId)).toBeNull();
    expect(world.getComponent(selectionEntity, uiRenderableId)).toBeNull();
  });
});
