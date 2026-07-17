import { describe, expect, it } from 'vitest';
import {
  computeNineSliceInstances,
  NineSliceParams,
  validateNineSliceInsets,
} from './nine-slice.js';
import { Vector2 } from '../../math/index.js';

const baseParams = (
  overrides: Partial<NineSliceParams> = {},
): NineSliceParams => ({
  width: 100,
  height: 100,
  textureWidth: 64,
  textureHeight: 64,
  insets: { left: 16, right: 16, top: 16, bottom: 16 },
  pivot: new Vector2(0.5, 0.5),
  uvOffset: new Vector2(0, 0),
  uvScale: new Vector2(1, 1),
  ...overrides,
});

describe('computeNineSliceInstances', () => {
  it('emits nine sub-quads, top-to-bottom then left-to-right, for non-zero insets on both axes', () => {
    const instances = computeNineSliceInstances(baseParams());

    expect(instances).toHaveLength(9);
  });

  it('gives every corner its native (inset) size regardless of the sprite size', () => {
    for (const size of [50, 100, 200, 1000]) {
      const instances = computeNineSliceInstances(
        baseParams({ width: size, height: size }),
      );

      const corners = [instances[0], instances[2], instances[6], instances[8]];

      for (const corner of corners) {
        expect(corner.size).toEqual(new Vector2(16, 16));
      }
    }
  });

  it('stretches edges along one axis and the center along both', () => {
    const instances = computeNineSliceInstances(
      baseParams({ width: 100, height: 100 }),
    );

    // Top edge: native height, stretched width (100 - 16 - 16 = 68).
    expect(instances[1].size).toEqual(new Vector2(68, 16));
    // Left edge: stretched height, native width.
    expect(instances[3].size).toEqual(new Vector2(16, 68));
    // Center: stretched on both axes.
    expect(instances[4].size).toEqual(new Vector2(68, 68));
  });

  it('maps each slice to the correct texture region for a known texture and insets', () => {
    const instances = computeNineSliceInstances(baseParams());

    // Top-left corner samples the top-left 16px of the 64px texture.
    expect(instances[0].uvOffset).toEqual(new Vector2(0, 0));
    expect(instances[0].uvScale).toEqual(new Vector2(0.25, 0.25));

    // Center samples the inner region between the insets.
    expect(instances[4].uvOffset).toEqual(new Vector2(0.25, 0.25));
    expect(instances[4].uvScale).toEqual(new Vector2(0.5, 0.5));

    // Bottom-right corner samples the bottom-right 16px.
    expect(instances[8].uvOffset).toEqual(new Vector2(0.75, 0.75));
    expect(instances[8].uvScale).toEqual(new Vector2(0.25, 0.25));
  });

  it('distinguishes the left and right texture columns (asymmetric insets)', () => {
    const instances = computeNineSliceInstances(
      baseParams({ insets: { left: 8, right: 24, top: 16, bottom: 16 } }),
    );

    // Left column: native width 8, texture region [0, 8/64] = [0, 0.125].
    expect(instances[0].size.x).toBe(8);
    expect(instances[0].uvOffset.x).toBeCloseTo(0);
    expect(instances[0].uvScale.x).toBeCloseTo(0.125);

    // Right column: native width 24, texture region [(64 - 24)/64, 1].
    expect(instances[2].size.x).toBe(24);
    expect(instances[2].uvOffset.x).toBeCloseTo(0.625);
    expect(instances[2].uvScale.x).toBeCloseTo(0.375);
  });

  it('encodes the exact pivot/size the sprite shader needs to position each slice', () => {
    const instances = computeNineSliceInstances(baseParams());

    // Derived from the shader's own pivot math
    // `startEdge = (-0.5 - pivot) * size * 0.5` solved per segment.
    expect(instances[0].pivot).toEqual(new Vector2(5.75, 5.75)); // top-left
    expect(instances[4].pivot).toEqual(new Vector2(0.5, 0.5)); // center
    expect(instances[8].pivot).toEqual(new Vector2(-4.75, -4.75)); // bottom-right
  });

  it('composes slice texture regions with the sprite’s own uvOffset/uvScale (atlas frame)', () => {
    const instances = computeNineSliceInstances(
      baseParams({
        uvOffset: new Vector2(0.1, 0.2),
        uvScale: new Vector2(0.5, 0.5),
      }),
    );

    // Top-left corner: base offset, plus zero fraction, scaled into the frame.
    expect(instances[0].uvOffset).toEqual(new Vector2(0.1, 0.2));
    expect(instances[0].uvScale).toEqual(new Vector2(0.25 * 0.5, 0.25 * 0.5));

    // Center: base offset + 0.25 fraction of the 0.5-wide frame.
    expect(instances[4].uvOffset).toEqual(
      new Vector2(0.1 + 0.25 * 0.5, 0.2 + 0.25 * 0.5),
    );
  });

  it('collapses a zero-inset axis instead of emitting zero-area quads', () => {
    // No horizontal insets: one column, three rows.
    const instances = computeNineSliceInstances(
      baseParams({ insets: { left: 0, right: 0, top: 16, bottom: 16 } }),
    );

    expect(instances).toHaveLength(3);

    for (const instance of instances) {
      expect(instance.size.x).toBe(100);
      expect(instance.uvScale.x).toBe(1);
    }
  });

  it('reduces to a single quad identical to the un-sliced sprite when all insets are zero', () => {
    const params = baseParams({
      insets: { left: 0, right: 0, top: 0, bottom: 0 },
      pivot: new Vector2(0.3, 0.7),
      uvOffset: new Vector2(0.1, 0.2),
      uvScale: new Vector2(0.5, 0.6),
    });

    const instances = computeNineSliceInstances(params);

    expect(instances).toHaveLength(1);
    expect(instances[0].size).toEqual(new Vector2(100, 100));
    // The pivot is reconstructed through the shader's own algebra, so it
    // matches to floating-point precision rather than bit-for-bit.
    expect(instances[0].pivot.x).toBeCloseTo(params.pivot.x);
    expect(instances[0].pivot.y).toBeCloseTo(params.pivot.y);
    expect(instances[0].uvOffset).toEqual(params.uvOffset);
    expect(instances[0].uvScale).toEqual(params.uvScale);
  });
});

describe('validateNineSliceInsets', () => {
  it('accepts insets that leave room for a center on both axes', () => {
    expect(() =>
      validateNineSliceInsets(
        { left: 16, right: 16, top: 16, bottom: 16 },
        64,
        64,
      ),
    ).not.toThrow();
  });

  it('rejects negative insets', () => {
    expect(() =>
      validateNineSliceInsets(
        { left: -1, right: 16, top: 16, bottom: 16 },
        64,
        64,
      ),
    ).toThrow(/non-negative/);
  });

  it('rejects horizontal insets that meet or exceed the texture width', () => {
    expect(() =>
      validateNineSliceInsets(
        { left: 40, right: 30, top: 16, bottom: 16 },
        64,
        64,
      ),
    ).toThrow(/width/);
  });

  it('rejects vertical insets that meet or exceed the texture height', () => {
    expect(() =>
      validateNineSliceInsets(
        { left: 16, right: 16, top: 40, bottom: 40 },
        64,
        64,
      ),
    ).toThrow(/height/);
  });
});
