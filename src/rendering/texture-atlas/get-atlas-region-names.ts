import { compareNamesNaturally } from './compare-names-naturally.js';
import { describeMissingName } from './suggest-names.js';
import type { TextureAtlas } from './texture-atlas.js';

/**
 * Finds the names of an atlas's regions that start with `prefix`, in
 * natural order: runs of digits compare as numbers, so `run_2` comes before
 * `run_10` and `run_9.png` before `run_10.png`. Use it to list an
 * animation's frames in an atlas exported without an animations list (see
 * `TextureAtlas.sequences`), or in a TexturePacker "JSON (Hash)" file,
 * whose region order isn't the frame order.
 * @param atlas - The atlas to search.
 * @param prefix - The start every returned name has, matched as written
 * and case-sensitive: `'run'` also matches `runner_0`, so include the
 * separator (`'run_'`). `''` returns every name.
 * @returns A new array of names.
 * @throws An error if no region's name starts with `prefix`, naming up to
 * three close ones.
 */
export function getAtlasRegionNames(
  atlas: TextureAtlas,
  prefix: string,
): string[] {
  const names = atlas.regions.map(({ name }) => name);
  const matches = names.filter((name) => name.startsWith(prefix));

  if (matches.length === 0) {
    throw new Error(
      `Unable to find regions starting with "${prefix}" in the texture atlas. ${describeMissingName(prefix, names)}`,
    );
  }

  return matches.sort(compareNamesNaturally);
}
