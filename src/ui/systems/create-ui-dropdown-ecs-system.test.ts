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
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { createUiDropdownEcsSystem } from './create-ui-dropdown-ecs-system';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from './create-ui-state-ecs-system';
import { createUiDropdown } from '../utilities/create-ui-dropdown';
import { registerUiInputActions } from '../utilities/register-ui-input-actions';
import type { FontAsset } from '../text/types/font-asset';

const mockRenderable = {} as Renderable<UiInstanceComponents>;
const mockRenderContext = {
  gl: {},
  createProgram: () => {},
} as unknown as RenderContext;
const mockFont = {} as unknown as FontAsset;

interface TestWorld {
  world: EcsWorld;
  inputManager: InputManager;
  canvas: number;
  cancelAction: { trigger: () => void };
}

function makeWorld(): TestWorld {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');
  inputManager.addHoldActions(pressAction);
  const actions = registerUiInputActions(inputManager);

  world.addSystem(createUiStateEcsSystem(inputManager));
  world.addSystem(createUiDropdownEcsSystem(inputManager));

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
    canvas,
    cancelAction: { trigger: () => actions.cancel.trigger() },
  };
}

function makeDropdown(tw: TestWorld) {
  return createUiDropdown(tw.world, {
    renderable: mockRenderable,
    optionRenderable: mockRenderable,
    scrollRenderable: mockRenderable,
    renderContext: mockRenderContext,
    font: mockFont,
    options: ['Alpha', 'Beta', 'Gamma'],
    canvasEntity: tw.canvas,
    rect: { x: 10, y: 10, width: 120, height: 32 },
  });
}

describe('createUiDropdownEcsSystem', () => {
  describe('open transition', () => {
    it('enables popup renderable when isOpen becomes true', () => {
      const tw = makeWorld();
      const { dropdown, popupEntity } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      const renderable = tw.world.getComponent(popupEntity, uiRenderableId);
      expect(renderable?.enabled).toBe(true);
    });

    it('enables option renderables when isOpen becomes true', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      for (const optEntity of dropdown.optionEntities) {
        const r = tw.world.getComponent(optEntity, uiRenderableId);
        expect(r?.enabled).toBe(true);
      }
    });

    it('sets option focusable = true when open', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      for (const optEntity of dropdown.optionEntities) {
        const f = tw.world.getComponent(optEntity, uiFocusableId);
        expect(f?.focusable).toBe(true);
      }
    });

    it('raises onOpen event when opening', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);
      let opened = false;
      dropdown.onOpen.registerListener(() => {
        opened = true;
      });

      dropdown.isOpen = true;
      tw.world.update();

      expect(opened).toBe(true);
    });
  });

  describe('close transition', () => {
    it('disables popup renderable when isOpen becomes false', () => {
      const tw = makeWorld();
      const { dropdown, popupEntity } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      dropdown.isOpen = false;
      tw.world.update();

      const renderable = tw.world.getComponent(popupEntity, uiRenderableId);
      expect(renderable?.enabled).toBe(false);
    });

    it('sets option focusable = false when closed', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      dropdown.isOpen = false;
      tw.world.update();

      for (const optEntity of dropdown.optionEntities) {
        const f = tw.world.getComponent(optEntity, uiFocusableId);
        expect(f?.focusable).toBe(false);
      }
    });

    it('raises onClose event when closing', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);
      let closed = false;
      dropdown.onClose.registerListener(() => {
        closed = true;
      });

      dropdown.isOpen = true;
      tw.world.update();

      dropdown.isOpen = false;
      tw.world.update();

      expect(closed).toBe(true);
    });

    it('returns focus to trigger on close', () => {
      const tw = makeWorld();
      const { dropdown, triggerEntity } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      dropdown.isOpen = false;
      tw.world.update();

      const focusComp = tw.world.getComponent(tw.canvas, uiFocusId);
      expect(focusComp?.focused).toBe(triggerEntity);
    });
  });

  describe('Escape to close', () => {
    it('closes on cancel action while open', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      tw.cancelAction.trigger();
      tw.world.update();

      expect(dropdown.isOpen).toBe(false);
    });
  });

  describe('option selection', () => {
    it('selecting an option updates selectedIndex and closes popup', () => {
      const tw = makeWorld();
      const { dropdown } = makeDropdown(tw);

      dropdown.isOpen = true;
      tw.world.update();

      // Simulate click on option index 1
      const optState = tw.world.getComponent(
        dropdown.optionEntities[1],
        uiStateId,
      );
      optState?.onClick.raise({
        entity: dropdown.optionEntities[1],
        pointer: new Vector2(0, 0),
        source: 'pointer',
      });

      expect(dropdown.selectedIndex).toBe(1);
      expect(dropdown.isOpen).toBe(false);
    });

    it('fires onChange when option selected', () => {
      const tw = makeWorld();
      const received: number[] = [];
      const { dropdown } = createUiDropdown(tw.world, {
        renderable: mockRenderable,
        optionRenderable: mockRenderable,
        scrollRenderable: mockRenderable,
        renderContext: mockRenderContext,
        font: mockFont,
        options: ['Alpha', 'Beta', 'Gamma'],
        canvasEntity: tw.canvas,
        rect: { x: 10, y: 10, width: 120, height: 32 },
        onChange: (e) => received.push(e.selectedIndex),
      });

      dropdown.isOpen = true;
      tw.world.update();

      const optState = tw.world.getComponent(
        dropdown.optionEntities[2],
        uiStateId,
      );
      optState?.onClick.raise({
        entity: dropdown.optionEntities[2],
        pointer: new Vector2(0, 0),
        source: 'pointer',
      });

      expect(received).toEqual([2]);
    });
  });
});
