import { describe, expect, it } from 'vitest';
import { createDropdown } from './create-dropdown.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textId } from '../../text/index.js';
import { parentId, positionId } from '../../common/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiDropdownId } from '../components/ui-dropdown-component.js';
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

  it('flips the chevron text when the header is invoked, and back when it closes again', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
    });

    expect(world.getComponent(dropdown.chevron, textId)!.text).toBe('v');

    dropdown.header.interactable.onInvoke.raise();

    expect(world.getComponent(dropdown.chevron, textId)!.text).toBe('^');

    dropdown.header.interactable.onInvoke.raise();

    expect(world.getComponent(dropdown.chevron, textId)!.text).toBe('v');
  });

  it('resets the chevron to closed when an option is selected', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
    });

    dropdown.header.interactable.onInvoke.raise();
    dropdown.options[1].interactable.onInvoke.raise();

    expect(world.getComponent(dropdown.chevron, textId)!.text).toBe('v');
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

  it('passes through anchoredPosition and labelCategory to the header and every option row', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
      anchor: UiAnchor.topLeft({ x: 240, y: 56 }),
      anchoredPosition: { x: 10, y: -10 },
      labelCategory: 0b0100,
    });

    expect(world.getComponent(dropdown.entity, parentId)).toEqual({ parent });
    expect(world.getComponent(dropdown.entity, positionId)).not.toBeNull();
    expect(
      world.getComponent(dropdown.entity, rectTransformId)!.anchoredPosition,
    ).toEqual({ x: 10, y: -10 });
    expect(world.getComponent(dropdown.header.label, textId)!.category).toBe(
      0b0100,
    );

    for (const optionButton of dropdown.options) {
      expect(world.getComponent(optionButton.label, textId)!.category).toBe(
        0b0100,
      );
    }
  });

  it("centers each option row's label against the header's full width, not the option row's own (stretched, zero-width) rect, while the header's own label reserves room for the chevron", () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const dropdown = createDropdown(world, parent, {
      headerSprite: buildSprite(),
      optionSprite: buildSprite(),
      options: ['Low', 'Medium', 'High'],
      fontAtlas,
      labelSize: 24,
    });

    expect(world.getComponent(dropdown.header.label, textId)!.maxWidth).toBe(
      240 - 24 * 1.5,
    );

    for (const optionButton of dropdown.options) {
      expect(world.getComponent(optionButton.label, textId)!.maxWidth).toBe(
        240,
      );
    }
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
