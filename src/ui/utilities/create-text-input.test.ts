import { afterEach, describe, expect, it } from 'vitest';
import { createTextInput } from './create-text-input.js';
import { parentId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  Color,
  Renderable,
  RenderContext,
  spriteId,
} from '../../rendering/index.js';
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
  renderable: {} as Renderable,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  enabled: true,
  layer: 0,
});

describe('createTextInput', () => {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');

  container.appendChild(canvas);

  const renderContext = { canvas } as unknown as RenderContext;

  afterEach(() => {
    container.replaceChildren(canvas);
  });

  it('builds an interactable field with a text entry in the canvas container', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const field = createTextInput(world, parent, {
      renderContext,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
      value: 'hi',
      placeholder: 'Name',
      maxLength: 8,
      attributes: { ariaLabel: 'Name' },
    });

    expect(world.getComponent(field.entity, parentId)).toEqual({ parent });
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

    expect(world.getComponent(field.textLabel, textId)!.text).toBe('hi');
    expect(world.getComponent(field.textLabel, textId)!.richText).toBe(false);
    expect(world.getComponent(field.placeholderLabel, textId)!.richText).toBe(
      false,
    );
    expect(world.getComponent(field.placeholderLabel, textId)!.text).toBe(
      'Name',
    );
    expect(world.getComponent(field.placeholderLabel, textId)!.enabled).toBe(
      false,
    );

    for (const part of [
      field.textInput.caret,
      field.textInput.selection,
      field.textInput.compositionUnderline,
    ]) {
      expect(world.getComponent(part, spriteId)!.enabled).toBe(false);
    }
  });

  it('passes the anchored position, filter and category through', () => {
    const world = new EcsWorld();
    const filter = (text: string): string => text.toUpperCase();

    const field = createTextInput(world, world.createEntity(), {
      renderContext,
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

  it('throws when the render context canvas has no parent element', () => {
    const world = new EcsWorld();

    expect(() =>
      createTextInput(world, world.createEntity(), {
        renderContext: {
          canvas: document.createElement('canvas'),
        } as unknown as RenderContext,
        sprite: buildSprite(),
        fillSprite: buildSprite(),
        fontAtlas,
        size: 20,
      }),
    ).toThrow(/no parent element/);
  });
});
