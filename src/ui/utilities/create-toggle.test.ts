import { describe, expect, it } from 'vitest';
import { createToggle } from './create-toggle.js';
import { parentId, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import { uiColorTransitionId } from '../components/ui-color-transition-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { uiToggleId } from '../components/ui-toggle-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

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

describe('createToggle', () => {
  it('creates an interactable panel, with a color transition, and a checkmark child hidden by default', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();
    const checkmarkSprite = buildSprite();

    const toggle = createToggle(world, parent, {
      sprite,
      checkmarkSprite,
    });

    expect(world.getComponent(toggle.entity, parentId)).toEqual({ parent });
    expect(world.getComponent(toggle.entity, positionId)).not.toBeNull();
    expect(
      world.getComponent(toggle.entity, rectTransformId)!.anchorMin,
    ).toEqual(UiAnchor.center.anchorMin);
    expect(world.getComponent(toggle.entity, spriteId)!.renderable).toBe(
      sprite.renderable,
    );
    expect(world.getComponent(toggle.entity, uiInteractableId)).toBe(
      toggle.interactable,
    );
    expect(
      world.getComponent(toggle.entity, uiColorTransitionId),
    ).not.toBeNull();
    expect(world.getComponent(toggle.entity, uiToggleId)).toBe(toggle.toggle);

    expect(world.getComponent(toggle.checkmark, parentId)).toEqual({
      parent: toggle.entity,
    });
    expect(world.getComponent(toggle.checkmark, spriteId)!.enabled).toBe(false);
  });

  it('sizes the checkmark to exactly fill the box, with no stretch margin', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
    });

    expect(
      world.getComponent(toggle.checkmark, rectTransformId)!.sizeDelta,
    ).toEqual({ x: 0, y: 0 });
  });

  it('starts the checkmark visible when isOn is true', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
      isOn: true,
    });

    expect(toggle.toggle.isOn).toBe(true);
    expect(world.getComponent(toggle.checkmark, spriteId)!.enabled).toBe(true);
  });

  it('syncs the checkmark visibility when onValueChanged is raised', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
    });

    toggle.toggle.onValueChanged.raise(true);

    expect(world.getComponent(toggle.checkmark, spriteId)!.enabled).toBe(true);

    toggle.toggle.onValueChanged.raise(false);

    expect(world.getComponent(toggle.checkmark, spriteId)!.enabled).toBe(false);
  });

  it('exposes onValueChanged directly, matching the toggle event', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
    });

    expect(toggle.onValueChanged).toBe(toggle.toggle.onValueChanged);
  });

  it('passes through a group reference and interactable/transition overrides', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const group = world.createEntity();
    const hoverColor = new Color(0.9, 0.9, 0.9, 1);

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
      group,
      interactable: { interactable: false },
      transition: { hoverColor, duration: 250 },
    });

    expect(toggle.toggle.group).toBe(group);
    expect(toggle.interactable.interactable).toBe(false);

    const transition = world.getComponent(toggle.entity, uiColorTransitionId)!;

    expect(transition.hoverColor).toBe(hoverColor);
    expect(transition.duration).toBe(250);
  });

  it('passes through anchoredPosition', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
      anchoredPosition: { x: 5, y: -5 },
    });

    expect(
      world.getComponent(toggle.entity, rectTransformId)!.anchoredPosition,
    ).toEqual({ x: 5, y: -5 });
  });

  it('defaults sizeDelta to 32x32', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const toggle = createToggle(world, parent, {
      sprite: buildSprite(),
      checkmarkSprite: buildSprite(),
    });

    expect(
      world.getComponent(toggle.entity, rectTransformId)!.sizeDelta,
    ).toEqual({ x: 32, y: 32 });
  });
});
