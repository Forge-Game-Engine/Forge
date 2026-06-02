import { describe, expect, it } from 'vitest';
import { getMouseButtonName, mouseButtons } from './mouse-buttons';

describe('getMouseButtonName', () => {
  it('returns "left" for mouseButtons.left', () => {
    expect(getMouseButtonName(mouseButtons.left)).toBe('left');
  });

  it('returns "middle" for mouseButtons.middle', () => {
    expect(getMouseButtonName(mouseButtons.middle)).toBe('middle');
  });

  it('returns "right" for mouseButtons.right', () => {
    expect(getMouseButtonName(mouseButtons.right)).toBe('right');
  });

  it('returns "extra1" for mouseButtons.extra1', () => {
    expect(getMouseButtonName(mouseButtons.extra1)).toBe('extra1');
  });

  it('returns "extra2" for mouseButtons.extra2', () => {
    expect(getMouseButtonName(mouseButtons.extra2)).toBe('extra2');
  });

  it('returns undefined for an unknown button value', () => {
    // @ts-expect-error: testing invalid value
    expect(getMouseButtonName(99)).toBeUndefined();
  });
});
