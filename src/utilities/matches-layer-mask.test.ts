import { describe, expect, it } from 'vitest';
import { matchesLayerMask } from './matches-layer-mask';

describe('matchesLayerMask', () => {
  it('returns true when layer has the mask bit set', () => {
    expect(matchesLayerMask(0b001, 0b001)).toBe(true);
    expect(matchesLayerMask(0b101, 0b100)).toBe(true);
    expect(matchesLayerMask(0b110, 0b010)).toBe(true);
  });

  it('returns false when no bits overlap', () => {
    expect(matchesLayerMask(0b001, 0b010)).toBe(false);
    expect(matchesLayerMask(0b000, 0b001)).toBe(false);
    expect(matchesLayerMask(0b1000, 0b0011)).toBe(false);
  });

  it('returns false when mask is zero', () => {
    expect(matchesLayerMask(0b111, 0b000)).toBe(false);
    expect(matchesLayerMask(0, 0)).toBe(false);
  });

  it('works with multiple bits set in mask', () => {
    // mask has bits 0 and 2 set (0b101); layer matches bit 2
    expect(matchesLayerMask(0b100, 0b101)).toBe(true);
    // layer matches none
    expect(matchesLayerMask(0b010, 0b101)).toBe(false);
  });
});
