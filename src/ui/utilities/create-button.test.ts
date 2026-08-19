import { describe, expect, it } from 'vitest';
import { createButton } from './create-button.js';
import { parentId, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textId } from '../../text/index.js';
import { uiColorTransitionId } from '../components/ui-color-transition-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const fontAtlas = {} as FontAtlas;

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

describe('createButton', () => {
  it('creates an interactable panel, with a color transition, and a centered child label', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();

    const button = createButton(world, parent, {
      sprite,
      label: 'Play',
      fontAtlas,
      labelSize: 32,
    });

    expect(world.getComponent(button.entity, parentId)).toEqual({ parent });
    expect(world.getComponent(button.entity, positionId)).not.toBeNull();
    expect(
      world.getComponent(button.entity, rectTransformId)!.anchorMin,
    ).toEqual(UiAnchor.center.anchorMin);
    expect(world.getComponent(button.entity, spriteId)!.renderable).toBe(
      sprite.renderable,
    );
    expect(world.getComponent(button.entity, uiInteractableId)).toBe(
      button.interactable,
    );
    expect(
      world.getComponent(button.entity, uiColorTransitionId),
    ).not.toBeNull();

    expect(world.getComponent(button.label, parentId)).toEqual({
      parent: button.entity,
    });
    expect(world.getComponent(button.label, textId)!.text).toBe('Play');
    expect(world.getComponent(button.label, textId)!.fontAtlas).toBe(fontAtlas);
  });

  it('defaults sizeDelta to 200x60', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const button = createButton(world, parent, {
      sprite: buildSprite(),
      label: 'Play',
      fontAtlas,
      labelSize: 32,
    });

    expect(
      world.getComponent(button.entity, rectTransformId)!.sizeDelta,
    ).toEqual({ x: 200, y: 60 });
  });

  it('exposes onActivate directly, matching the interactable event', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const button = createButton(world, parent, {
      sprite: buildSprite(),
      label: 'Play',
      fontAtlas,
      labelSize: 32,
    });

    let activations = 0;
    button.onActivate.registerListener(() => (activations += 1));

    button.interactable.onActivate.raise();

    expect(activations).toBe(1);
    expect(button.onActivate).toBe(button.interactable.onActivate);
  });

  it('passes through interactable and transition overrides', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const hoverColor = new Color(0.9, 0.9, 0.9, 1);

    const button = createButton(world, parent, {
      sprite: buildSprite(),
      label: 'Play',
      fontAtlas,
      labelSize: 32,
      interactable: { interactable: false },
      transition: { hoverColor, duration: 250 },
    });

    expect(button.interactable.interactable).toBe(false);

    const transition = world.getComponent(button.entity, uiColorTransitionId)!;

    expect(transition.hoverColor).toBe(hoverColor);
    expect(transition.duration).toBe(250);
  });
});
