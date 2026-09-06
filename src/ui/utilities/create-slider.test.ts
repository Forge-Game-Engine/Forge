import { describe, expect, it } from 'vitest';
import { createSlider } from './create-slider.js';
import { parentId, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiColorTransitionId } from '../components/ui-color-transition-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { uiSliderId } from '../components/ui-slider-component.js';
import { uiAxisValue, UiStretchAxis } from '../types/ui-axis.js';

const buildSprite = () => ({
  width: 1,
  height: 1,
  renderable: {} as Renderable,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  enabled: true,
  layer: 0,
});

describe('createSlider', () => {
  it('creates an interactable track with a handle child', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
    });

    expect(world.getComponent(slider.entity, parentId)).toEqual({ parent });
    expect(world.getComponent(slider.entity, uiInteractableId)).toBe(
      slider.interactable,
    );
    expect(world.getComponent(slider.entity, uiSliderId)).toBe(slider.slider);
    expect(
      world.getComponent(slider.entity, uiColorTransitionId),
    ).not.toBeNull();

    expect(world.getComponent(slider.handle, parentId)).toEqual({
      parent: slider.entity,
    });
    expect(world.getComponent(slider.handle, spriteId)).not.toBeNull();
    expect(world.getComponent(slider.handle, positionId)).not.toBeNull();
    expect(slider.fill).toBeUndefined();
  });

  it('defaults dragThreshold to 0 for the track interactable', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
    });

    expect(slider.interactable.dragThreshold).toBe(0);
  });

  it('creates a fill entity only when fillSprite is given, and anchors it to the initial value', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
      fillSprite: buildSprite(),
      minValue: 0,
      maxValue: 10,
      value: 5,
    });

    expect(slider.fill).not.toBeUndefined();
    expect(
      (world.getComponent(slider.fill!, rectTransformId)!.x as UiStretchAxis)
        .anchorMax,
    ).toBeCloseTo(0.5);
  });

  it('anchors the handle to the initial value', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
      minValue: 0,
      maxValue: 4,
      value: 1,
    });

    const handleRectTransform = world.getComponent(
      slider.handle,
      rectTransformId,
    )!;

    expect((handleRectTransform.x as { anchor: number }).anchor).toBeCloseTo(
      0.25,
    );
  });

  it('exposes onValueChanged directly, matching the slider event', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
    });

    expect(slider.onValueChanged).toBe(slider.slider.onValueChanged);
  });

  it('passes through anchoredPosition', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
      anchoredPosition: { x: 5, y: -5 },
    });

    expect(
      world.getComponent(slider.entity, rectTransformId)!.anchoredPosition,
    ).toEqual({ x: 5, y: -5 });
  });

  it('passes through interactable and transition overrides', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const hoverColor = new Color(0.9, 0.9, 0.9, 1);

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
      interactable: { interactable: false },
      transition: { hoverColor, duration: 250 },
    });

    expect(slider.interactable.interactable).toBe(false);

    const transition = world.getComponent(slider.entity, uiColorTransitionId)!;

    expect(transition.hoverColor).toBe(hoverColor);
    expect(transition.duration).toBe(250);
  });

  it('defaults the track size to 300x24 and handleSize to 24x24', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const slider = createSlider(world, parent, {
      trackSprite: buildSprite(),
      handleSprite: buildSprite(),
    });

    const trackRectTransform = world.getComponent(
      slider.entity,
      rectTransformId,
    )!;
    const handleRectTransform = world.getComponent(
      slider.handle,
      rectTransformId,
    )!;

    expect({
      x: uiAxisValue(trackRectTransform.x),
      y: uiAxisValue(trackRectTransform.y),
    }).toEqual({ x: 300, y: 24 });
    expect({
      x: uiAxisValue(handleRectTransform.x),
      y: uiAxisValue(handleRectTransform.y),
    }).toEqual({ x: 24, y: 24 });
  });
});
