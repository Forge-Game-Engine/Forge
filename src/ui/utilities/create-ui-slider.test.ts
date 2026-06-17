import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { Renderable } from '../../rendering/renderable';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiSliderId } from '../components/ui-slider-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiInteractableId } from '../components/ui-interactable-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import { createUiSlider } from './create-ui-slider';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

describe('createUiSlider', () => {
  describe('entity assembly', () => {
    it('creates a track entity with required components', () => {
      const world = new EcsWorld();
      const { entity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
      });

      expect(world.getComponent(entity, uiTransformId)).toBeTruthy();
      expect(world.getComponent(entity, uiRenderableId)).toBeTruthy();
      expect(world.getComponent(entity, uiStateId)).toBeTruthy();
      expect(world.getComponent(entity, uiSliderId)).toBeTruthy();
    });

    it('creates a fill child entity', () => {
      const world = new EcsWorld();
      const { fillEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
      });

      expect(world.getComponent(fillEntity, uiRenderableId)).toBeTruthy();
    });

    it('creates a knob child entity with interactable and focusable', () => {
      const world = new EcsWorld();
      const { knobEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
      });

      expect(world.getComponent(knobEntity, uiInteractableId)).toBeTruthy();
      expect(world.getComponent(knobEntity, uiFocusableId)).toBeTruthy();
      expect(world.getComponent(knobEntity, uiStateId)).toBeTruthy();
    });
  });

  describe('initial value clamping', () => {
    it('clamps initial value to min', () => {
      const world = new EcsWorld();
      const { slider } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: -10,
        min: 0,
        max: 100,
      });

      expect(slider.value).toBe(0);
    });

    it('clamps initial value to max', () => {
      const world = new EcsWorld();
      const { slider } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 200,
        min: 0,
        max: 100,
      });

      expect(slider.value).toBe(100);
    });

    it('uses mid-range initial value as given', () => {
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

      expect(slider.value).toBe(50);
    });
  });

  describe('fill anchor at creation', () => {
    it('sets fill anchorMax.x to normalised value for horizontal', () => {
      const world = new EcsWorld();
      const { fillEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 50,
        min: 0,
        max: 100,
        orientation: 'horizontal',
      });

      const fillT = world.getComponent(fillEntity, uiTransformId)!;

      expect(fillT.anchorMax.x).toBeCloseTo(0.5);
      expect(fillT.anchorMax.y).toBeCloseTo(1);
    });

    it('sets fill anchorMax.y to normalised value for vertical', () => {
      const world = new EcsWorld();
      const { fillEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        value: 75,
        min: 0,
        max: 100,
        orientation: 'vertical',
      });

      const fillT = world.getComponent(fillEntity, uiTransformId)!;

      expect(fillT.anchorMax.y).toBeCloseTo(0.75);
      expect(fillT.anchorMax.x).toBeCloseTo(1);
    });
  });

  describe('knob anchor at creation', () => {
    it('sets knob anchor.x to normalised value for horizontal', () => {
      const world = new EcsWorld();
      const { knobEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 20,
        knobHeight: 20,
        value: 25,
        min: 0,
        max: 100,
        orientation: 'horizontal',
      });

      const knobT = world.getComponent(knobEntity, uiTransformId)!;

      expect(knobT.anchorMin.x).toBeCloseTo(0.25);
      expect(knobT.anchorMax.x).toBeCloseTo(0.25);
      expect(knobT.anchorMin.y).toBeCloseTo(0.5);
    });

    it('centres knob with offsetMin/offsetMax based on knobWidth/Height', () => {
      const world = new EcsWorld();
      const { knobEntity } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 20,
        knobHeight: 24,
      });

      const knobT = world.getComponent(knobEntity, uiTransformId)!;

      expect(knobT.offsetMin.x).toBeCloseTo(-10);
      expect(knobT.offsetMax.x).toBeCloseTo(10);
      expect(knobT.offsetMin.y).toBeCloseTo(-12);
      expect(knobT.offsetMax.y).toBeCloseTo(12);
    });
  });

  describe('onChange event wiring', () => {
    it('registers provided onChange handler', () => {
      const world = new EcsWorld();
      const handler = vi.fn();
      const { slider } = createUiSlider(world, {
        renderable: mockRenderable,
        fillRenderable: mockRenderable,
        knobRenderable: mockRenderable,
        knobWidth: 16,
        knobHeight: 16,
        onChange: handler,
      });

      slider.onChange.raise({ entity: 0, value: 0.5 });

      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
