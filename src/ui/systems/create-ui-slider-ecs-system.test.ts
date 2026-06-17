import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { HoldAction } from '../../input/actions/hold-action';
import { TriggerAction } from '../../input/actions/trigger-action';
import { InputManager } from '../../input/input-manager';
import { Rect, Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiSliderId } from '../components/ui-slider-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import {
  createUiStateEcsSystem,
  uiPrimaryPressActionName,
} from './create-ui-state-ecs-system';
import {
  createUiSliderEcsSystem,
  uiSliderEndActionName,
  uiSliderHomeActionName,
} from './create-ui-slider-ecs-system';
import { createUiSlider } from '../utilities/create-ui-slider';
import {
  registerUiInputActions,
  uiInputActionNames,
} from '../utilities/register-ui-input-actions';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

interface SliderWorld {
  world: EcsWorld;
  pressAction: HoldAction;
  canvas: number;
  navLeft: TriggerAction;
  navRight: TriggerAction;
  navUp: TriggerAction;
  navDown: TriggerAction;
  homeAction: TriggerAction;
  endAction: TriggerAction;
}

function makeWorld(): SliderWorld {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const pressAction = new HoldAction(uiPrimaryPressActionName, 'ui');

  inputManager.addHoldActions(pressAction);
  registerUiInputActions(inputManager);

  const homeAction = new TriggerAction(uiSliderHomeActionName, 'ui');
  const endAction = new TriggerAction(uiSliderEndActionName, 'ui');

  inputManager.addTriggerActions(homeAction, endAction);

  let navLeft: TriggerAction;
  let navRight: TriggerAction;
  let navUp: TriggerAction;
  let navDown: TriggerAction;

  try {
    navLeft = inputManager.getTriggerAction(uiInputActionNames.navigateLeft);
    navRight = inputManager.getTriggerAction(uiInputActionNames.navigateRight);
    navUp = inputManager.getTriggerAction(uiInputActionNames.navigateUp);
    navDown = inputManager.getTriggerAction(uiInputActionNames.navigateDown);
  } catch {
    navLeft = new TriggerAction(uiInputActionNames.navigateLeft, 'ui');
    navRight = new TriggerAction(uiInputActionNames.navigateRight, 'ui');
    navUp = new TriggerAction(uiInputActionNames.navigateUp, 'ui');
    navDown = new TriggerAction(uiInputActionNames.navigateDown, 'ui');
    inputManager.addTriggerActions(navLeft, navRight, navUp, navDown);
  }

  world.addSystem(createUiStateEcsSystem(inputManager));
  world.addSystem(createUiSliderEcsSystem(inputManager));

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

  return {
    world,
    pressAction,
    canvas,
    navLeft,
    navRight,
    navUp,
    navDown,
    homeAction,
    endAction,
  };
}

function setPointer(
  world: EcsWorld,
  canvas: number,
  x: number,
  y: number,
): void {
  const ps = world.getComponent(canvas, uiPointerStateId)!;

  ps.pointer.x = x;
  ps.pointer.y = y;
}

function setTrackRect(
  world: EcsWorld,
  entity: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const t = world.getComponent(entity, uiTransformId)!;

  t.resolvedRect = new Rect(new Vector2(x, y), new Vector2(width, height));
}

describe('createUiSliderEcsSystem', () => {
  describe('value math', () => {
    it('normalizes value correctly at midpoint', () => {
      const world = new EcsWorld();
      const { slider } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
      });

      const normalized =
        (slider.value - slider.min) / (slider.max - slider.min);

      expect(normalized).toBeCloseTo(0.5);
    });

    it('snaps to step correctly', () => {
      const step = 2;
      const min = 0;
      const rawValue = 3.3;
      const stepped = min + Math.round((rawValue - min) / step) * step;

      expect(stepped).toBeCloseTo(4);
    });

    it('clamps value to max during drag', () => {
      const sw = makeWorld();
      const { entity, knobEntity } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 0,
        min: 0,
        max: 100,
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);
      setPointer(sw.world, sw.canvas, 0, 0);

      const ps = sw.world.getComponent(sw.canvas, uiPointerStateId)!;
      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      ps.hovered = knobEntity;
      knobState.pressed = true;
      ps.pointer.x = 300;
      sw.world.update();

      const slider = sw.world.getComponent(entity, uiSliderId)!;

      expect(slider.value).toBeLessThanOrEqual(100);
    });
  });

  describe('drag interaction', () => {
    it('updates value when knob is dragged horizontally', () => {
      const sw = makeWorld();
      const { entity, knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 0,
        min: 0,
        max: 100,
        orientation: 'horizontal',
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);
      setPointer(sw.world, sw.canvas, 0, 10);

      const ps = sw.world.getComponent(sw.canvas, uiPointerStateId)!;

      ps.hovered = knobEntity;
      sw.pressAction.startHold();
      sw.world.update();

      setPointer(sw.world, sw.canvas, 100, 10);
      sw.world.update();

      expect(slider.value).toBeCloseTo(50, 0);
    });

    it('fires onChangeStart when drag begins', () => {
      const sw = makeWorld();
      const startHandler = vi.fn();
      const { entity, knobEntity } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        onChangeStart: startHandler,
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);

      const ps = sw.world.getComponent(sw.canvas, uiPointerStateId)!;

      ps.hovered = knobEntity;
      sw.pressAction.startHold();
      sw.world.update();

      expect(startHandler).toHaveBeenCalledOnce();
    });

    it('fires onChangeEnd when drag ends', () => {
      const sw = makeWorld();
      const endHandler = vi.fn();
      const { entity, knobEntity } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        onChangeEnd: endHandler,
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;
      const ps = sw.world.getComponent(sw.canvas, uiPointerStateId)!;

      ps.hovered = knobEntity;
      sw.pressAction.startHold();
      sw.world.update();

      sw.pressAction.endHold();
      knobState.pressed = false;
      ps.hovered = null;
      sw.world.update();

      expect(endHandler).toHaveBeenCalledOnce();
    });

    it('updates fill anchorMax.x after drag', () => {
      const sw = makeWorld();
      const { entity, knobEntity, fillEntity } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 0,
        min: 0,
        max: 100,
        orientation: 'horizontal',
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);

      const ps = sw.world.getComponent(sw.canvas, uiPointerStateId)!;

      ps.hovered = knobEntity;
      sw.pressAction.startHold();
      sw.world.update();

      setPointer(sw.world, sw.canvas, 100, 10);
      sw.world.update();

      const fillT = sw.world.getComponent(fillEntity, uiTransformId)!;

      expect(fillT.anchorMax.x).toBeCloseTo(0.5, 1);
    });
  });

  describe('keyboard interaction', () => {
    it('increments value by step on navigateRight when focused', () => {
      const sw = makeWorld();
      const { knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
        step: 10,
        orientation: 'horizontal',
      });

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      knobState.focused = true;
      sw.navRight.trigger();
      sw.world.update();

      expect(slider.value).toBeCloseTo(60);
    });

    it('decrements value by step on navigateLeft when focused', () => {
      const sw = makeWorld();
      const { knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
        step: 10,
        orientation: 'horizontal',
      });

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      knobState.focused = true;
      sw.navLeft.trigger();
      sw.world.update();

      expect(slider.value).toBeCloseTo(40);
    });

    it('increments value by step on navigateDown for vertical slider', () => {
      const sw = makeWorld();
      const { knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
        step: 10,
        orientation: 'vertical',
      });

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      knobState.focused = true;
      sw.navDown.trigger();
      sw.world.update();

      expect(slider.value).toBeCloseTo(60);
    });

    it('jumps to min on Home action', () => {
      const sw = makeWorld();
      const { knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 75,
        min: 10,
        max: 100,
      });

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      knobState.focused = true;
      sw.homeAction.trigger();
      sw.world.update();

      expect(slider.value).toBeCloseTo(10);
    });

    it('jumps to max on End action', () => {
      const sw = makeWorld();
      const { knobEntity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 25,
        min: 0,
        max: 100,
      });

      const knobState = sw.world.getComponent(knobEntity, uiStateId)!;

      knobState.focused = true;
      sw.endAction.trigger();
      sw.world.update();

      expect(slider.value).toBeCloseTo(100);
    });

    it('does not adjust value when not focused', () => {
      const sw = makeWorld();
      const { slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
        step: 10,
      });

      sw.navRight.trigger();
      sw.world.update();

      expect(slider.value).toBe(50);
    });
  });

  describe('track click', () => {
    it('jumps value to track click position', () => {
      const sw = makeWorld();
      const { entity, slider } = createUiSlider(sw.world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 0,
        min: 0,
        max: 100,
        orientation: 'horizontal',
      });

      setTrackRect(sw.world, entity, 0, 0, 200, 20);
      setPointer(sw.world, sw.canvas, 150, 10);

      const trackState = sw.world.getComponent(entity, uiStateId)!;

      trackState.pressed = true;
      sw.world.update();

      expect(slider.value).toBeCloseTo(75, 0);
    });
  });
});
