import { describe, expect, it } from 'vitest';
import { createScrollView } from './create-scroll-view.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, maskId, spriteId, Texture } from '../../rendering/index.js';
import { contentSizeFitterId } from '../components/content-size-fitter-component.js';
import { uiAxisLayoutGroupId } from '../components/layout-group-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { uiScrollRectId } from '../components/ui-scroll-rect-component.js';

const buildSprite = () => ({
  width: 1,
  height: 1,
  texture: {} as Texture,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  emissive: null,
  material: null,
  category: 1,
  enabled: true,
  layer: 0,
});

describe('createScrollView', () => {
  it('creates a masked viewport that receives drags but not focus, with a vertical list as content', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const scrollView = createScrollView(world, parent);

    expect(world.getParent(scrollView.entity)).toBe(parent);
    expect(world.getComponent(scrollView.entity, maskId)?.shape).toEqual({
      kind: 'rect',
    });
    expect(world.getComponent(scrollView.entity, spriteId)).toBeNull();
    expect(scrollView.interactable.receivesDrag).toBe(true);
    expect(scrollView.interactable.focusable).toBe(false);
    expect(world.getComponent(scrollView.entity, uiScrollRectId)).toBe(
      scrollView.scrollRect,
    );
    expect(scrollView.scrollRect.horizontal).toBe(false);
    expect(scrollView.scrollRect.vertical).toBe(true);

    expect(world.getParent(scrollView.content)).toBe(scrollView.entity);
    expect(
      world.getComponent(scrollView.content, uiAxisLayoutGroupId)?.direction,
    ).toBe('vertical');
    expect(
      world.getComponent(scrollView.content, contentSizeFitterId)?.verticalFit,
    ).toBe('preferredSize');
    expect(scrollView.verticalScrollbar).toBeUndefined();
  });

  it('creates a vertical scrollbar beside a narrowed list when both scrollbar sprites are given', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const scrollView = createScrollView(world, parent, {
      sprite: buildSprite(),
      scrollbarSprite: buildSprite(),
      scrollbarHandleSprite: buildSprite(),
      scrollbarWidth: 20,
    });
    const { track, handle } = scrollView.verticalScrollbar!;

    expect(world.getComponent(scrollView.entity, spriteId)).not.toBeNull();
    expect(world.getParent(track)).toBe(scrollView.entity);
    expect(world.getParent(handle)).toBe(track);
    expect(scrollView.scrollRect.verticalScrollbar?.track).toBe(track);

    const trackInteractable = world.getComponent(track, uiInteractableId)!;

    expect(trackInteractable.receivesDrag).toBe(true);
    expect(trackInteractable.focusable).toBe(false);
    expect(world.getComponent(handle, rectTransformId)!.y.kind).toBe('stretch');
    expect(
      world.getComponent(scrollView.content, rectTransformId)!.x,
    ).toMatchObject({ kind: 'stretch', margin: -20 });
  });
});
