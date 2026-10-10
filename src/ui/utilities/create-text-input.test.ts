import { afterEach, describe, expect, it } from 'vitest';
import { createTextInput } from './create-text-input.js';
import { EcsWorld } from '../../ecs/index.js';
import { createTextEntryService } from '../../input/index.js';
import { Color, Texture, visibilityId } from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textId } from '../../text/index.js';
import { uiColorTransitionId } from '../components/ui-color-transition-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { textInputId } from '../components/text-input-component.js';

const fontAtlas = {
  data: {
    metrics: {
      lineHeight: 1.2,
      ascender: 0.8,
      descender: -0.2,
      capHeight: 0.7,
    },
    glyphs: new Map(),
  },
} as unknown as FontAtlas;

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
  layer: 0,
});

describe('createTextInput', () => {
  const container = document.createElement('div');
  const textEntries = createTextEntryService(container);

  afterEach(() => {
    textEntries.releaseAll();
  });

  it("builds an interactable field with a text entry from the service, owned by the field's entity", () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const field = createTextInput(world, parent, {
      textEntries,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
      value: 'hi',
      placeholder: 'Name',
      maxLength: 8,
      attributes: { ariaLabel: 'Name' },
    });

    expect(world.getParent(field.entity)).toBe(parent);
    expect(world.getComponent(field.entity, uiInteractableId)).toBe(
      field.interactable,
    );
    expect(
      world.getComponent(field.entity, uiColorTransitionId),
    ).not.toBeNull();
    expect(world.getComponent(field.entity, textInputId)).toBe(field.textInput);

    expect(field.textInput.value).toBe('hi');
    expect(field.textInput.maxLength).toBe(8);
    expect(field.textInput.attributes).toEqual({ ariaLabel: 'Name' });
    expect(field.textInput.entry.element.parentElement).toBe(container);
    expect(field.textInput.entry.value).toBe('hi');
    expect(textEntries.get(field.entity)).toBe(field.textInput.entry);

    expect(world.getComponent(field.textLabel, textId)!.text).toBe('hi');
    expect(world.getComponent(field.textLabel, textId)!.richText).toBe(false);
    expect(world.getComponent(field.placeholderLabel, textId)!.richText).toBe(
      false,
    );
    expect(world.getComponent(field.placeholderLabel, textId)!.text).toBe(
      'Name',
    );
    expect(
      world.getComponent(field.placeholderLabel, visibilityId)!.visible,
    ).toBe(false);

    for (const part of [
      field.textInput.caret,
      field.textInput.selection,
      field.textInput.compositionUnderline,
    ]) {
      expect(world.getComponent(part, visibilityId)!.visible).toBe(false);
    }
  });

  it('passes the anchored position, filter and category through', () => {
    const world = new EcsWorld();
    const filter = (text: string): string => text.toUpperCase();

    const field = createTextInput(world, world.createEntity(), {
      textEntries,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
      anchoredPosition: { x: 10, y: 20 },
      filter,
      category: 4,
    });

    expect(
      world.getComponent(field.entity, rectTransformId)!.anchoredPosition,
    ).toEqual({ x: 10, y: 20 });
    expect(field.textInput.filter).toBe(filter);
    expect(field.textInput.maxLength).toBe(Number.POSITIVE_INFINITY);
    expect(world.getComponent(field.textLabel, textId)!.category).toBe(4);
  });
});
