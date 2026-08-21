import { describe, expect, it } from 'vitest';
import { createDropdown } from './create-dropdown.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textId } from '../../text/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiDropdownId } from '../components/ui-dropdown-component.js';

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

describe('createDropdown', () => {
  it('creates a header showing the selected option, with one hidden row per option', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
    });

    expect(world.getComponent(dropdown.entity, uiDropdownId)).toBe(
      dropdown.dropdown,
    );
    expect(world.getComponent(dropdown.header.label, textId)!.text).toBe('Low');
    expect(dropdown.options).toHaveLength(3);

    for (const optionButton of dropdown.options) {
      expect(optionButton.interactable.interactable).toBe(false);
      expect(optionButton.interactable.blocksRaycasts).toBe(false);
      expect(world.getComponent(optionButton.entity, spriteId)!.enabled).toBe(
        false,
      );
      expect(world.getComponent(optionButton.label, textId)!.enabled).toBe(
        false,
      );
    }
  });

  it('opens and closes the option rows when the header is invoked', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
    });

    dropdown.header.interactable.onInvoke.raise();

    expect(dropdown.dropdown.isOpen).toBe(true);

    for (const optionButton of dropdown.options) {
      expect(optionButton.interactable.interactable).toBe(true);
      expect(optionButton.interactable.blocksRaycasts).toBe(true);
      expect(world.getComponent(optionButton.entity, spriteId)!.enabled).toBe(
        true,
      );
    }

    dropdown.header.interactable.onInvoke.raise();

    expect(dropdown.dropdown.isOpen).toBe(false);

    for (const optionButton of dropdown.options) {
      expect(optionButton.interactable.interactable).toBe(false);
    }
  });

  it('selects an option, updates the header label, raises onValueChanged, and closes', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
    });

    const values: number[] = [];
    dropdown.onValueChanged.registerListener((value) => values.push(value));

    dropdown.header.interactable.onInvoke.raise();
    dropdown.options[2].interactable.onInvoke.raise();

    expect(values).toEqual([2]);
    expect(dropdown.dropdown.selectedIndex).toBe(2);
    expect(dropdown.dropdown.isOpen).toBe(false);
    expect(world.getComponent(dropdown.header.label, textId)!.text).toBe(
      'High',
    );
  });

  it('starts showing the option at selectedIndex when given', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
      selectedIndex: 1,
    });

    expect(dropdown.dropdown.selectedIndex).toBe(1);
    expect(world.getComponent(dropdown.header.label, textId)!.text).toBe(
      'Medium',
    );
  });

  it('stacks option rows below the header at optionHeight increments', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
      optionHeight: 40,
    });

    expect(
      world.getComponent(dropdown.options[0].entity, rectTransformId)!
        .anchoredPosition.y,
    ).toBeCloseTo(0);
    expect(
      world.getComponent(dropdown.options[1].entity, rectTransformId)!
        .anchoredPosition.y,
    ).toBe(-40);
    expect(
      world.getComponent(dropdown.options[2].entity, rectTransformId)!
        .anchoredPosition.y,
    ).toBe(-80);
  });
});
