import { describe, expect, it, vi } from 'vitest';
import { getComponentRemoveHook } from './component-hooks.js';
import { createComponentId, createTagId } from './ecs-component.js';

describe('createComponentId hooks', () => {
  it('keeps the remove hook it was given for the key', () => {
    const onRemove = vi.fn();
    const key = createComponentId<number>('Hooked', { onRemove });

    expect(getComponentRemoveHook(key)).toBe(onRemove);
  });

  it('gives a key made without hooks no remove hook', () => {
    expect(getComponentRemoveHook(createComponentId('Plain'))).toBeUndefined();
    expect(
      getComponentRemoveHook(createComponentId('Empty', {})),
    ).toBeUndefined();
  });

  it('gives each key its own hook, even with the same name', () => {
    const first = vi.fn();
    const second = vi.fn();
    const a = createComponentId<number>('Same', { onRemove: first });
    const b = createComponentId<number>('Same', { onRemove: second });

    expect(getComponentRemoveHook(a)).toBe(first);
    expect(getComponentRemoveHook(b)).toBe(second);
  });

  it('gives tags no hooks', () => {
    expect(getComponentRemoveHook(createTagId('Tag'))).toBeUndefined();
  });
});
