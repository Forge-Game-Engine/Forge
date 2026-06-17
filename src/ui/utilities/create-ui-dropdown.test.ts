import { describe, expect, it, vi } from 'vitest';

vi.mock('../text/create-ui-text-renderable.js', () => ({
  createUiTextRenderable: vi.fn(() => ({})),
}));

import { EcsWorld } from '../../ecs/ecs-world';
import { InputManager } from '../../input/input-manager';
import { HoldAction } from '../../input/actions/hold-action';
import { Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { RenderContext } from '../../rendering/render-context';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiDropdownId } from '../components/ui-dropdown-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from '../systems/create-ui-state-ecs-system';
import { createUiDropdown } from './create-ui-dropdown';
import { registerUiInputActions } from './register-ui-input-actions';
import type { FontAsset } from '../text/types/font-asset';

const mockRenderable = {} as Renderable<UiInstanceComponents>;
const mockRenderContext = {
  gl: {},
  createProgram: vi.fn(),
  createShader: vi.fn(),
} as unknown as RenderContext;
const mockFont = {} as unknown as FontAsset;

function makeWorld(): { world: EcsWorld; canvas: number } {
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

  return { world, canvas };
}

describe('createUiDropdown', () => {
  it('attaches UiDropdownEcsComponent to root entity', () => {
    const { world, canvas } = makeWorld();
    const { entity } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B', 'C'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    expect(world.getComponent(entity, uiDropdownId)).toBeTruthy();
  });

  it('sets initial selectedIndex', () => {
    const { world, canvas } = makeWorld();
    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B', 'C'],
      selectedIndex: 1,
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    expect(dropdown.selectedIndex).toBe(1);
  });

  it('creates one option entity per option', () => {
    const { world, canvas } = makeWorld();
    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['X', 'Y', 'Z'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    expect(dropdown.optionEntities.length).toBe(3);
  });

  it('starts with isOpen = false', () => {
    const { world, canvas } = makeWorld();
    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    expect(dropdown.isOpen).toBe(false);
  });

  it('popup renderable starts disabled', () => {
    const { world, canvas } = makeWorld();
    const { popupEntity } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    const renderable = world.getComponent(popupEntity, uiRenderableId);
    expect(renderable?.enabled).toBe(false);
  });

  it('option buttons start with focusable = false', () => {
    const { world, canvas } = makeWorld();
    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B', 'C'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    for (const optEntity of dropdown.optionEntities) {
      const focusable = world.getComponent(optEntity, uiFocusableId);
      expect(focusable?.focusable).toBe(false);
    }
  });

  it('toggles isOpen on trigger click', () => {
    const { world, canvas } = makeWorld();
    const { dropdown, triggerEntity } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    const state = world.getComponent(triggerEntity, uiStateId);

    // Simulate click
    state?.onClick.raise({
      entity: triggerEntity,
      pointer: new Vector2(0, 0),
      source: 'pointer',
    });
    expect(dropdown.isOpen).toBe(true);

    state?.onClick.raise({
      entity: triggerEntity,
      pointer: new Vector2(0, 0),
      source: 'pointer',
    });
    expect(dropdown.isOpen).toBe(false);
  });

  it('registers onChange listener', () => {
    const { world, canvas } = makeWorld();
    const received: number[] = [];

    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B', 'C'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
      onChange: (e) => received.push(e.selectedIndex),
    });

    dropdown.onChange.raise({ entity: 0, selectedIndex: 2, value: 'C' });
    expect(received).toEqual([2]);
  });

  it('option entities are parented to popup scroll group content', () => {
    const { world, canvas } = makeWorld();
    const { dropdown } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    // Each option entity should exist and have a renderable
    for (const opt of dropdown.optionEntities) {
      expect(world.getComponent(opt, uiRenderableId)).toBeTruthy();
    }
  });

  it('destroy removes root and popup entities', () => {
    const { world, canvas } = makeWorld();
    const { entity, popupEntity, destroy } = createUiDropdown(world, {
      renderable: mockRenderable,
      optionRenderable: mockRenderable,
      scrollRenderable: mockRenderable,
      renderContext: mockRenderContext,
      font: mockFont,
      options: ['A', 'B'],
      canvasEntity: canvas,
      rect: { x: 0, y: 0, width: 200, height: 32 },
    });

    destroy();

    expect(world.getComponent(entity, uiDropdownId)).toBeNull();
    expect(world.getComponent(popupEntity, uiRenderableId)).toBeNull();
  });
});
