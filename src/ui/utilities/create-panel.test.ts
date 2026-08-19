import { describe, expect, it } from 'vitest';
import { createPanel } from './create-panel.js';
import { parentId, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
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

describe('createPanel', () => {
  it('creates a parented, sprite-carrying entity with a center-anchored rect transform by default', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();

    const panel = createPanel(world, parent, { sprite });

    expect(world.getComponent(panel, parentId)).toEqual({ parent });
    expect(world.getComponent(panel, positionId)).not.toBeNull();
    expect(world.getComponent(panel, rectTransformId)!.anchorMin).toEqual(
      UiAnchor.center.anchorMin,
    );
    expect(world.getComponent(panel, spriteId)!.renderable).toBe(
      sprite.renderable,
    );
  });

  it('applies the given anchor, anchoredPosition, and sizeDelta', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();

    const panel = createPanel(world, parent, {
      sprite,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: 10, y: -10 },
      sizeDelta: { x: 200, y: 100 },
    });

    const rectTransform = world.getComponent(panel, rectTransformId)!;

    expect(rectTransform.anchorMin).toEqual(UiAnchor.topLeft.anchorMin);
    expect(rectTransform.anchoredPosition).toEqual({ x: 10, y: -10 });
    expect(rectTransform.sizeDelta).toEqual({ x: 200, y: 100 });
  });

  it('clones the passed sprite rather than aliasing it, so reusing one across panels is safe', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();

    const panelA = createPanel(world, parent, { sprite });
    const panelB = createPanel(world, parent, { sprite });

    world.getComponent(panelA, spriteId)!.pivot.x = 0.9;

    expect(world.getComponent(panelB, spriteId)!.pivot.x).toBe(0.5);
    expect(sprite.pivot.x).toBe(0.5);
  });

  it('overrides the sprite slices when given', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const sprite = buildSprite();
    const slices = { left: 8, right: 8, top: 8, bottom: 8 };

    const panel = createPanel(world, parent, { sprite, slices });

    expect(world.getComponent(panel, spriteId)!.slices).toBe(slices);
  });
});
