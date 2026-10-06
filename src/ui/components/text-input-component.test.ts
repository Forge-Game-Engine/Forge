import { describe, expect, it } from 'vitest';
import {
  addTextInputComponent,
  editTextInput,
  setTextInputValue,
} from './text-input-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { createTextEntry } from '../../input/index.js';

describe('TextInputEcsComponent', () => {
  const build = () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const entry = createTextEntry(document.createElement('div'));
    const component = addTextInputComponent(world, entity, {
      entry,
      textLabel: world.createEntity(),
      placeholderLabel: world.createEntity(),
      caret: world.createEntity(),
      selection: world.createEntity(),
      compositionUnderline: world.createEntity(),
      value: 'start',
    });

    return { world, entity, entry, component };
  };

  it('defaults to no length limit and no attributes, with the initial value in the entry', () => {
    const { component, entry } = build();

    expect(component.maxLength).toBe(Number.POSITIVE_INFINITY);
    expect(component.attributes).toEqual({});
    expect(component.value).toBe('start');
    expect(component.isEditing).toBe(false);
    expect(entry.value).toBe('start');
  });

  it("setTextInputValue writes the field's entry", () => {
    const { world, entity, entry, component } = build();

    setTextInputValue(world, entity, 'next');

    expect(entry.value).toBe('next');
    // `value` is the system's to update, on the next tick.
    expect(component.value).toBe('start');
  });

  it("editTextInput focuses the field's entry", () => {
    const { world, entity, entry } = build();

    document.body.appendChild(entry.element);
    editTextInput(world, entity);

    expect(entry.isFocused).toBe(true);
    entry.dispose();
  });
});
