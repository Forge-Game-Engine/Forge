import { describe, expect, it } from 'vitest';
import { createQuadIndices, quadIndices } from './quad-indices.js';

describe('createQuadIndices', () => {
  it('uses 16-bit indices while every vertex fits in them', () => {
    const indices = createQuadIndices(16_384);

    expect(indices).toBeInstanceOf(Uint16Array);
    expect(indices).toHaveLength(16_384 * 6);
    expect([...indices.subarray(-6)]).toEqual([
      65_532, 65_533, 65_534, 65_532, 65_534, 65_535,
    ]);
  });

  it('uses 32-bit indices past 16,384 tiles, with the same pattern', () => {
    const indices = createQuadIndices(16_385);

    expect(indices).toBeInstanceOf(Uint32Array);
    expect(indices).toHaveLength(16_385 * 6);
    expect([...indices.subarray(0, 12)]).toEqual([
      ...quadIndices.subarray(0, 12),
    ]);
    expect([...indices.subarray(-6)]).toEqual([
      65_536, 65_537, 65_538, 65_536, 65_538, 65_539,
    ]);
  });
});
