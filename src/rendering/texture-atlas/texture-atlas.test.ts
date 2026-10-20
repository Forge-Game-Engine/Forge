import { describe, expect, it } from 'vitest';
import type { Texture } from '../texture.js';
import { isTextureRegionTrimmed } from '../texture-region.js';
import type { AtlasRegionRect } from './atlas-region.js';
import { createTextureAtlas } from './texture-atlas.js';

const texture = { width: 128, height: 64 } as Texture;

const rect = (overrides: Partial<AtlasRegionRect> = {}): AtlasRegionRect => ({
  name: 'hero',
  x: 32,
  y: 16,
  width: 16,
  height: 8,
  ...overrides,
});

describe('createTextureAtlas', () => {
  describe('converting texel rects', () => {
    it("converts a rect to UVs on the texture's exact texel edges", () => {
      const region = createTextureAtlas(texture, [rect()]).regions[0];

      expect(region.uvOffset).toEqual({ x: 32 / 128, y: 16 / 64 });
      expect(region.uvScale).toEqual({ x: 16 / 128, y: 8 / 64 });
      expect(region.uvOffset.x).toBe(0.25);
      expect(region.uvOffset.y).toBe(0.25);
      expect(region.uvScale.x).toBe(0.125);
      expect(region.uvScale.y).toBe(0.125);
    });

    it('converts against a non-power-of-two texture', () => {
      const region = createTextureAtlas({ width: 100, height: 30 } as Texture, [
        rect({ x: 10, y: 3, width: 20, height: 6 }),
      ]).regions[0];

      expect(region.uvOffset).toEqual({ x: 10 / 100, y: 3 / 30 });
      expect(region.uvScale).toEqual({ x: 20 / 100, y: 6 / 30 });
    });

    it('gives an untrimmed rect an untrimmed region and its own size as sourceSize', () => {
      const region = createTextureAtlas(texture, [rect()]).regions[0];

      expect(region.trimOffset).toEqual({ x: 0, y: 0 });
      expect(region.trimScale).toEqual({ x: 1, y: 1 });
      expect(isTextureRegionTrimmed(region)).toBe(false);
      expect(region.sourceSize).toEqual({ x: 16, y: 8 });
    });

    it("converts a trimmed rect's trim to fractions of its untrimmed frame", () => {
      const region = createTextureAtlas(texture, [
        rect({ sourceWidth: 32, sourceHeight: 16, trimX: 8, trimY: 4 }),
      ]).regions[0];

      expect(region.trimOffset).toEqual({ x: 8 / 32, y: 4 / 16 });
      expect(region.trimScale).toEqual({ x: 16 / 32, y: 8 / 16 });
      expect(region.sourceSize).toEqual({ x: 32, y: 16 });
      expect(isTextureRegionTrimmed(region)).toBe(true);
    });

    it('pivots a region at its center by default', () => {
      const region = createTextureAtlas(texture, [rect()]).regions[0];

      expect(region.pivot).toEqual({ x: 0.5, y: 0.5 });
    });

    it('keeps a given pivot, including one outside 0 to 1, as a copy', () => {
      const pivot = { x: 0.5, y: 1.25 };
      const region = createTextureAtlas(texture, [rect({ pivot })]).regions[0];

      pivot.y = 0;

      expect(region.pivot).toEqual({ x: 0.5, y: 1.25 });
    });

    it('takes the default for a field passed as undefined', () => {
      const region = createTextureAtlas(texture, [
        rect({ sourceWidth: undefined, pivot: undefined }),
      ]).regions[0];

      expect(region.sourceSize).toEqual({ x: 16, y: 8 });
      expect(region.pivot).toEqual({ x: 0.5, y: 0.5 });
    });

    it('accepts a rect that ends exactly on the texture edge', () => {
      expect(() =>
        createTextureAtlas(texture, [
          rect({ x: 112, y: 56, width: 16, height: 8 }),
        ]),
      ).not.toThrow();
    });
  });

  describe('validation', () => {
    it.each([
      ['width', { width: 0, height: 64 }],
      ['height', { width: 128, height: 0 }],
    ])('throws for a texture whose %s is 0', (_, size) => {
      expect(() => createTextureAtlas(size as Texture, [rect()])).toThrow(
        /texture is \d+ x \d+ texels/,
      );
    });

    it('throws for an empty list of rects', () => {
      expect(() => createTextureAtlas(texture, [])).toThrow(
        'at least one region',
      );
    });

    it('throws for an empty name, giving its index', () => {
      expect(() =>
        createTextureAtlas(texture, [rect(), rect({ name: '' })]),
      ).toThrow('the region at index 1 has an empty name');
    });

    it('throws for a name used twice', () => {
      expect(() => createTextureAtlas(texture, [rect(), rect()])).toThrow(
        'the name "hero" is used by more than one region',
      );
    });

    it.each([
      ['x', { x: 1.5 }],
      ['width', { width: 0.25 }],
      ['sourceHeight', { sourceHeight: 8.5 }],
      ['trimY', { trimY: 0.5 }],
    ])(
      'throws, naming the region, for a non-integer %s',
      (field, overrides) => {
        expect(() => createTextureAtlas(texture, [rect(overrides)])).toThrow(
          `Unable to create texture atlas region "hero": its ${field}`,
        );
      },
    );

    it.each([
      ['x', { x: -1 }],
      ['y', { y: -1 }],
      ['trimX', { trimX: -1, sourceWidth: 32 }],
    ])('throws for a negative %s', (field, overrides) => {
      expect(() => createTextureAtlas(texture, [rect(overrides)])).toThrow(
        `its ${field} (-1) can't be negative`,
      );
    });

    it.each([
      ['width', { width: 0 }],
      ['height', { height: 0 }],
      ['sourceWidth', { sourceWidth: 0 }],
    ])('throws for a %s of 0', (field, overrides) => {
      expect(() => createTextureAtlas(texture, [rect(overrides)])).toThrow(
        `its ${field} (0) must be greater than 0`,
      );
    });

    it("throws for a rect that reaches past the texture's right edge", () => {
      expect(() =>
        createTextureAtlas(texture, [rect({ x: 120, width: 16 })]),
      ).toThrow(
        `Unable to create texture atlas region "hero": its rect (x 120, width 16) reaches past the texture's width of 128 texels.`,
      );
    });

    it("throws for a rect that reaches past the texture's bottom edge", () => {
      expect(() =>
        createTextureAtlas(texture, [rect({ y: 60, height: 8 })]),
      ).toThrow("reaches past the texture's height of 64 texels");
    });

    it("throws for a trim that doesn't fit in the untrimmed frame", () => {
      expect(() =>
        createTextureAtlas(texture, [rect({ sourceWidth: 18, trimX: 4 })]),
      ).toThrow(
        "its rect (trimX 4, width 16) reaches past its untrimmed frame's width of 18 texels",
      );
      expect(() =>
        createTextureAtlas(texture, [rect({ sourceHeight: 4 })]),
      ).toThrow("reaches past its untrimmed frame's height of 4 texels");
    });

    it("throws for a pivot that isn't finite", () => {
      expect(() =>
        createTextureAtlas(texture, [rect({ pivot: { x: NaN, y: 0 } })]),
      ).toThrow('its pivot (NaN, 0)');
    });
  });

  it('freezes the atlas, its regions and every region', () => {
    const atlas = createTextureAtlas(texture, [rect()]);

    expect(Object.isFrozen(atlas)).toBe(true);
    expect(Object.isFrozen(atlas.regions)).toBe(true);
    expect(Object.isFrozen(atlas.regions[0])).toBe(true);
    expect(Object.isFrozen(atlas.regions[0].sourceSize)).toBe(true);
    expect(Object.isFrozen(atlas.regions[0].pivot)).toBe(true);
    expect(Object.isFrozen(atlas.regions[0].uvOffset)).toBe(true);
  });

  it('keeps the texture and the order of the rects', () => {
    const atlas = createTextureAtlas(texture, [
      rect({ name: 'b' }),
      rect({ name: 'a' }),
      rect({ name: 'c' }),
    ]);

    expect(atlas.texture).toBe(texture);
    expect(atlas.regions.map((region) => region.name)).toEqual(['b', 'a', 'c']);
  });

  describe('scale', () => {
    it('defaults to 1', () => {
      expect(createTextureAtlas(texture, [rect()]).scale).toBe(1);
      expect(
        createTextureAtlas(texture, [rect()], { scale: undefined }).scale,
      ).toBe(1);
    });

    it('keeps the given scale and leaves the regions in whole texels', () => {
      const atlas = createTextureAtlas(texture, [rect()], { scale: 2 });

      expect(atlas.scale).toBe(2);
      expect(atlas.regions[0].sourceSize).toEqual({ x: 16, y: 8 });
      expect(atlas.regions[0].uvScale).toEqual({ x: 16 / 128, y: 8 / 64 });
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'throws for a scale of %s',
      (scale) => {
        expect(() => createTextureAtlas(texture, [rect()], { scale })).toThrow(
          `Unable to create a texture atlas: its scale (${scale}) must be a finite number greater than 0.`,
        );
      },
    );
  });

  describe('lookups', () => {
    const atlas = createTextureAtlas(texture, [
      rect({ name: 'hero_idle_0' }),
      rect({ name: 'hero_idle_1' }),
      rect({ name: 'hero_run_0' }),
      rect({ name: 'coin' }),
    ]);

    it('looks up a region by name', () => {
      expect(atlas.getRegion('hero_run_0')).toBe(atlas.regions[2]);
    });

    it('says whether a region has a name', () => {
      expect(atlas.hasRegion('coin')).toBe(true);
      expect(atlas.hasRegion('gem')).toBe(false);
    });

    it('looks up a region by index', () => {
      expect(atlas.getRegionAt(0)).toBe(atlas.regions[0]);
      expect(atlas.getRegionAt(3)).toBe(atlas.regions[3]);
    });

    it.each([-1, 4, 1.5, NaN])(
      'throws for the index %s, giving the valid range',
      (index) => {
        expect(() => atlas.getRegionAt(index)).toThrow(
          `Unable to find the region at index ${index} in the texture atlas: the index must be a whole number from 0 to 3.`,
        );
      },
    );

    it('throws for a missing name, suggesting close names nearest first', () => {
      expect(() => atlas.getRegion('hero_idol_0')).toThrow(
        'Unable to find region "hero_idol_0" in the texture atlas. Did you mean "hero_idle_0", "hero_idle_1"?',
      );
    });

    it('suggests a name that differs only in case', () => {
      expect(() => atlas.getRegion('COIN')).toThrow('Did you mean "coin"?');
    });

    it('suggests names that start with the requested name', () => {
      expect(() => atlas.getRegion('hero_run')).toThrow(
        'Did you mean "hero_run_0"',
      );
    });

    it('lists the region count and first names when nothing is close', () => {
      expect(() => atlas.getRegion('spaceship')).toThrow(
        'The atlas has 4 regions, named "hero_idle_0", "hero_idle_1", "hero_run_0", ...',
      );
    });

    it('lists every name of a small atlas when nothing is close', () => {
      const smallAtlas = createTextureAtlas(texture, [rect({ name: 'coin' })]);

      expect(() => smallAtlas.getRegion('spaceship')).toThrow(
        'The atlas has 1 region, named "coin".',
      );
    });
  });

  describe('sequences', () => {
    const rects = [
      rect({ name: 'run_0' }),
      rect({ name: 'run_1' }),
      rect({ name: 'jump_0' }),
    ];

    it('has no sequences by default', () => {
      const atlas = createTextureAtlas(texture, rects);

      expect(atlas.sequences.size).toBe(0);
      expect(() => atlas.getSequence('run')).toThrow(
        'Unable to find sequence "run" in the texture atlas: it has no sequences.',
      );
    });

    it('looks up a sequence by name', () => {
      const atlas = createTextureAtlas(texture, rects, {
        sequences: new Map([
          ['run', ['run_0', 'run_1', 'run_0']],
          ['jump', ['jump_0']],
        ]),
      });

      expect(atlas.getSequence('run')).toEqual(['run_0', 'run_1', 'run_0']);
      expect(atlas.getSequence('jump')).toEqual(['jump_0']);
      expect([...atlas.sequences.keys()]).toEqual(['run', 'jump']);
    });

    it('throws for a missing sequence, suggesting close names', () => {
      const atlas = createTextureAtlas(texture, rects, {
        sequences: new Map([
          ['run', ['run_0']],
          ['jump', ['jump_0']],
        ]),
      });

      expect(() => atlas.getSequence('rnu')).toThrow(
        'Unable to find sequence "rnu" in the texture atlas. Did you mean "run"?',
      );
      expect(() => atlas.getSequence('spaceship')).toThrow(
        'The atlas has 2 sequences, named "run", "jump".',
      );
    });

    it('copies the sequences and freezes each list', () => {
      const run = ['run_0', 'run_1'];
      const sequences = new Map([['run', run]]);
      const atlas = createTextureAtlas(texture, rects, { sequences });

      run.push('jump_0');
      sequences.set('jump', ['jump_0']);

      expect(atlas.getSequence('run')).toEqual(['run_0', 'run_1']);
      expect(Object.isFrozen(atlas.getSequence('run'))).toBe(true);
      expect(atlas.sequences.has('jump')).toBe(false);
    });

    it('throws for a sequence with an empty name', () => {
      expect(() =>
        createTextureAtlas(texture, rects, {
          sequences: new Map([['', ['run_0']]]),
        }),
      ).toThrow(
        'Unable to create a texture atlas: it has a sequence with an empty name.',
      );
    });

    it('throws for an empty sequence', () => {
      expect(() =>
        createTextureAtlas(texture, rects, {
          sequences: new Map([['run', []]]),
        }),
      ).toThrow(
        'Unable to create a texture atlas: its sequence "run" is empty. A sequence must list at least one region.',
      );
    });

    it("throws for a sequence that lists a name that isn't a region's", () => {
      expect(() =>
        createTextureAtlas(texture, rects, {
          sequences: new Map([['run', ['run_0', 'run_2']]]),
        }),
      ).toThrow(
        'Unable to create a texture atlas: in its sequence "run", the atlas has no region named "run_2". Did you mean "run_0", "run_1"?',
      );
    });

    it('lists every missing name of a sequence in one error', () => {
      expect(() =>
        createTextureAtlas(texture, rects, {
          sequences: new Map([['run', ['run_2', 'run_0', 'jump_1', 'run_2']]]),
        }),
      ).toThrow(
        'in its sequence "run", the atlas has no regions named "run_2", "jump_1". "run_2": Did you mean',
      );
    });
  });
});
