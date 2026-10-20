import { describe, expect, it } from 'vitest';
import type { Texture } from '../../rendering/texture.js';
import type { AtlasRegionRect } from '../../rendering/texture-atlas/atlas-region.js';
import { createTextureAtlas } from '../../rendering/texture-atlas/texture-atlas.js';
import { createAtlasAnimationClip } from './create-atlas-animation-clip.js';

const texture = { width: 128, height: 64 } as Texture;

/** A trimmed 32 x 32 frame pivoted at its feet. */
const frame = (
  name: string,
  x: number,
  overrides: Partial<AtlasRegionRect> = {},
): AtlasRegionRect => ({
  name,
  x,
  y: 0,
  width: 20,
  height: 30,
  sourceWidth: 32,
  sourceHeight: 32,
  trimX: 6,
  trimY: 2,
  pivot: { x: 0.5, y: 1 },
  ...overrides,
});

const atlas = createTextureAtlas(texture, [
  frame('run_0', 0),
  // Packed smaller, with another trim, in the same untrimmed frame.
  frame('run_1', 20, { width: 16, height: 24, trimX: 8, trimY: 8 }),
  frame('run_2', 36),
  frame('idle_0', 56),
]);

describe('createAtlasAnimationClip', () => {
  it("builds a clip of the named regions, in order, on the atlas's texture", () => {
    const clip = createAtlasAnimationClip(atlas, ['run_0', 'run_1', 'run_2']);

    expect(clip.texture).toBe(texture);
    expect(clip.frames).toHaveLength(3);
    expect(clip.frames[0]).toBe(atlas.getRegion('run_0'));
    expect(clip.frames[1]).toBe(atlas.getRegion('run_1'));
    expect(clip.frames[2]).toBe(atlas.getRegion('run_2'));
  });

  it('builds a clip from indices', () => {
    const clip = createAtlasAnimationClip(atlas, [2, 0]);

    expect(clip.frames).toEqual([atlas.regions[2], atlas.regions[0]]);
  });

  it('takes names and indices together, and a region more than once', () => {
    const clip = createAtlasAnimationClip(atlas, ['run_0', 1, 'run_0', 3]);

    expect(clip.frames).toEqual([
      atlas.regions[0],
      atlas.regions[1],
      atlas.regions[0],
      atlas.regions[3],
    ]);
  });

  it('throws for an empty list of frames', () => {
    expect(() => createAtlasAnimationClip(atlas, [])).toThrow(
      'Unable to create an animation clip: it must have at least one frame.',
    );
  });

  it('throws for a missing name, suggesting close names', () => {
    expect(() => createAtlasAnimationClip(atlas, ['run_0', 'run_3'])).toThrow(
      'Unable to create an animation clip: the atlas has no region named "run_3". Did you mean "run_0", "run_1", "run_2"?',
    );
  });

  it('lists every missing name in one error, once each', () => {
    expect(() =>
      createAtlasAnimationClip(atlas, ['run_3', 'run_0', 'jump_0', 'run_3']),
    ).toThrow(
      'Unable to create an animation clip: the atlas has no regions named "run_3", "jump_0". "run_3": Did you mean',
    );
  });

  it("throws for an index that isn't a region's", () => {
    expect(() => createAtlasAnimationClip(atlas, [0, 4])).toThrow(
      'Unable to find the region at index 4 in the texture atlas: the index must be a whole number from 0 to 3.',
    );
  });

  it('throws for frames with different untrimmed sizes', () => {
    const mixedAtlas = createTextureAtlas(texture, [
      frame('run_0', 0),
      frame('lunge_0', 20, { sourceWidth: 48 }),
    ]);

    expect(() =>
      createAtlasAnimationClip(mixedAtlas, ['run_0', 'lunge_0']),
    ).toThrow(
      'Unable to create an animation clip: its frames "run_0" (32 x 32 texels) and "lunge_0" (48 x 32 texels) have different untrimmed sizes.',
    );
  });

  it('throws for frames with different pivots', () => {
    const mixedAtlas = createTextureAtlas(texture, [
      frame('run_0', 0),
      frame('lunge_0', 20, { pivot: { x: 0.5, y: 0.5 } }),
    ]);

    expect(() =>
      createAtlasAnimationClip(mixedAtlas, ['run_0', 'lunge_0']),
    ).toThrow(
      'Unable to create an animation clip: its frames "run_0" and "lunge_0" have different pivots ((0.5, 1) and (0.5, 0.5)).',
    );
  });

  it("builds a clip from an atlas's sequence", () => {
    const sequenceAtlas = createTextureAtlas(
      texture,
      [frame('run_0', 0), frame('run_1', 20)],
      { sequences: new Map([['run', ['run_1', 'run_0']]]) },
    );
    const clip = createAtlasAnimationClip(
      sequenceAtlas,
      sequenceAtlas.getSequence('run'),
    );

    expect(clip.frames).toEqual([
      sequenceAtlas.regions[1],
      sequenceAtlas.regions[0],
    ]);
  });
});
