import { describe, expect, it } from 'vitest';
import type { Texture } from '../texture.js';
import { getAtlasRegionNames } from './get-atlas-region-names.js';
import { createTextureAtlas } from './texture-atlas.js';

const texture = { width: 64, height: 64 } as Texture;

const atlasOf = (names: string[]) =>
  createTextureAtlas(
    texture,
    names.map((name) => ({ name, x: 0, y: 0, width: 8, height: 8 })),
  );

describe('getAtlasRegionNames', () => {
  it('returns the names that start with the prefix, in natural order', () => {
    const atlas = atlasOf(['run_10', 'jump_0', 'run_2', 'run_0', 'runner_0']);

    expect(getAtlasRegionNames(atlas, 'run_')).toEqual([
      'run_0',
      'run_2',
      'run_10',
    ]);
  });

  it('matches the prefix as written', () => {
    const atlas = atlasOf(['run_0', 'runner_0', 'Run_0']);

    expect(getAtlasRegionNames(atlas, 'run')).toEqual(['run_0', 'runner_0']);
  });

  it('returns every name for an empty prefix', () => {
    const atlas = atlasOf(['b_1', 'a_10', 'a_9']);

    expect(getAtlasRegionNames(atlas, '')).toEqual(['a_9', 'a_10', 'b_1']);
  });

  it("returns a new array and leaves the atlas's order alone", () => {
    const atlas = atlasOf(['run_1', 'run_0']);
    const names = getAtlasRegionNames(atlas, 'run_');

    names.push('extra');

    expect(atlas.regions.map(({ name }) => name)).toEqual(['run_1', 'run_0']);
    expect(getAtlasRegionNames(atlas, 'run_')).toEqual(['run_0', 'run_1']);
  });

  it('throws when no name starts with the prefix, suggesting close names', () => {
    const atlas = atlasOf(['hero_run_0', 'hero_run_1', 'coin']);

    expect(() => getAtlasRegionNames(atlas, 'run_')).toThrow(
      'Unable to find regions starting with "run_" in the texture atlas. Did you mean "hero_run_0", "hero_run_1"?',
    );
  });
});
