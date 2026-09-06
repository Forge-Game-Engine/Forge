import { describe, expect, it } from 'vitest';
import { getSafeAreaInsets } from './get-safe-area-insets.js';

describe('getSafeAreaInsets', () => {
  it('returns all zeroes when the browser reports no safe-area insets', () => {
    expect(getSafeAreaInsets()).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('reuses a single probe element across calls rather than creating a new one each time', () => {
    const childrenBefore = document.body.children.length;

    getSafeAreaInsets();
    getSafeAreaInsets();

    expect(document.body.children).toHaveLength(childrenBefore);
  });
});
