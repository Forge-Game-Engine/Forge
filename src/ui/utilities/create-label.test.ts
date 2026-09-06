import { describe, expect, it } from 'vitest';
import { createLabel } from './create-label.js';
import { parentId, positionId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  TEXT_RENDER_CATEGORY,
  textId,
  textVerticalAlignments,
} from '../../text/index.js';
import { layoutElementId } from '../components/layout-element-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const fontAtlas = {} as FontAtlas;

describe('createLabel', () => {
  it('creates a parented, text-carrying entity with a center-anchored rect transform by default', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Play',
      fontAtlas,
      size: 32,
    });

    expect(world.getComponent(label, parentId)).toEqual({ parent });
    expect(world.getComponent(label, positionId)).not.toBeNull();
    expect(world.getComponent(label, rectTransformId)!.anchorMin).toEqual(
      UiAnchor.center.anchorMin,
    );

    const text = world.getComponent(label, textId)!;

    expect(text.text).toBe('Play');
    expect(text.fontAtlas).toBe(fontAtlas);
    expect(text.size).toBe(32);
  });

  it('falls through to the TextEcsComponent default category when omitted', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Play',
      fontAtlas,
      size: 32,
    });

    expect(world.getComponent(label, textId)!.category).toBe(
      TEXT_RENDER_CATEGORY,
    );
  });

  it('accepts an explicit category override', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Play',
      fontAtlas,
      size: 32,
      category: 0b0010,
    });

    expect(world.getComponent(label, textId)!.category).toBe(0b0010);
  });

  it('applies the given anchor and passes through TextEcsComponent options', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Score: 0',
      fontAtlas,
      size: 24,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: 20, y: -20 },
      horizontalAlign: 'right',
    });

    const rectTransform = world.getComponent(label, rectTransformId)!;
    const text = world.getComponent(label, textId)!;

    expect(rectTransform.anchorMin).toEqual(UiAnchor.topLeft.anchorMin);
    expect(rectTransform.anchoredPosition).toEqual({ x: 20, y: -20 });
    expect(text.horizontalAlign).toBe('right');
  });

  it('attaches a LayoutElementEcsComponent with sizeToText when requested', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Music',
      fontAtlas,
      size: 20,
      sizeToText: true,
    });

    expect(world.getComponent(label, layoutElementId)?.sizeToText).toBe(true);
  });

  it('adds no LayoutElementEcsComponent when sizeToText is omitted', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Music',
      fontAtlas,
      size: 20,
    });

    expect(world.getComponent(label, layoutElementId)).toBeNull();
  });

  it("defaults verticalAlign to 'bottom' when sizeToText is set", () => {
    // Regression test: a layout-arranged child is always forced to a
    // bottom-left pivot, but verticalAlign's own default ('top') assumes a
    // top pivot instead - without this default, sizeToText labels render a
    // full line-height below their own measured box when placed in a
    // layout group.
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Music',
      fontAtlas,
      size: 20,
      sizeToText: true,
    });

    expect(world.getComponent(label, textId)!.verticalAlign).toBe(
      textVerticalAlignments.bottom,
    );
  });

  it('lets an explicit verticalAlign override the sizeToText default', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Music',
      fontAtlas,
      size: 20,
      sizeToText: true,
      verticalAlign: textVerticalAlignments.middle,
    });

    expect(world.getComponent(label, textId)!.verticalAlign).toBe(
      textVerticalAlignments.middle,
    );
  });

  it("keeps verticalAlign's own default ('top') when sizeToText is not set", () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const label = createLabel(world, parent, {
      text: 'Music',
      fontAtlas,
      size: 20,
    });

    expect(world.getComponent(label, textId)!.verticalAlign).toBe(
      textVerticalAlignments.top,
    );
  });
});
