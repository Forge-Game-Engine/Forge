import { describe, expect, it } from 'vitest';
import { getKerningPairKey } from './font-atlas-data.js';

describe('getKerningPairKey', () => {
  it('should build a key from a left and right code point', () => {
    expect(getKerningPairKey(65, 86)).toBe('65:86');
  });

  it('should build distinct keys for reversed pairs', () => {
    expect(getKerningPairKey(65, 86)).not.toBe(getKerningPairKey(86, 65));
  });
});
