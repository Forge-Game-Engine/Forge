import { withDefaults } from '../../utilities/with-defaults.js';
import type { Texture } from '../texture.js';
import {
  type AtlasRegion,
  type AtlasRegionRect,
  createAtlasRegion,
} from './atlas-region.js';
import {
  describeMissingName,
  describeMissingRegionNames,
  findMissingNames,
} from './suggest-names.js';

/**
 * One texture and the named regions cut from it. Sprites made from any of
 * its regions share the texture, so consecutive ones draw in one instanced
 * draw call.
 *
 * An atlas is immutable. Create one from texel rects with
 * {@link createTextureAtlas}, or from a uniform grid with
 * `createGridTextureAtlas`, and make sprites from its regions with
 * `createAtlasSprite`.
 */
export interface TextureAtlas {
  /**
   * The texture every region samples. The atlas doesn't own it: disposing
   * the texture is up to whoever loaded it. Its regions' UVs are computed
   * from the texture's size when the atlas is created, so replacing the
   * texture's contents with an image of another size leaves them
   * describing the old size; create a new atlas for it.
   */
  readonly texture: Texture;

  /**
   * Every region, in the order they were given (row-major for a grid
   * atlas). `regions[i]` is the region `getRegionAt(i)` returns.
   */
  readonly regions: readonly AtlasRegion[];

  /**
   * How many texels of the texture make up one pixel of the art it was
   * packed from: `2` for an atlas exported at twice the art's size (an
   * `@2x` export), `0.5` for one exported at half size, `1` otherwise.
   * Regions stay in whole texels of the texture; `createAtlasSprite`
   * divides a region's `sourceSize` by `scale` when it sizes the sprite, so
   * one `pixelsPerUnit` gives the same world size at every export scale.
   * Unrelated to a region's `trimScale`, which is the share of its
   * untrimmed frame the packed rect covers.
   */
  readonly scale: number;

  /**
   * Named frame lists, such as the animations an atlas packer detected,
   * each a list of region names in play order. Pass one to
   * `createAtlasAnimationClip` to build a clip from it. Empty unless the
   * atlas was created with `sequences` (a TexturePacker file's
   * `animations`).
   */
  readonly sequences: ReadonlyMap<string, readonly string[]>;

  /**
   * Looks up a region by name.
   * @param name - The region's name.
   * @returns The region.
   * @throws An error if no region has this name, naming up to three close
   * ones.
   */
  getRegion(name: string): AtlasRegion;

  /**
   * Whether a region has this name.
   * @param name - The name to check.
   * @returns `true` if `getRegion(name)` would return a region.
   */
  hasRegion(name: string): boolean;

  /**
   * Looks up a region by its index in `regions`.
   * @param index - The region's index.
   * @returns The region.
   * @throws An error if `index` isn't a whole number from `0` to
   * `regions.length - 1`.
   */
  getRegionAt(index: number): AtlasRegion;

  /**
   * Looks up a sequence by name.
   * @param name - The sequence's name.
   * @returns The sequence's region names, in play order.
   * @throws An error if there is no sequence with this name, naming up to
   * three close ones, or saying the atlas has no sequences.
   */
  getSequence(name: string): readonly string[];
}

/**
 * Options for {@link createTextureAtlas}.
 */
export interface CreateTextureAtlasOptions {
  /**
   * How many texels of the texture make up one pixel of the art it was
   * packed from (see {@link TextureAtlas.scale}). Defaults to `1`.
   */
  scale?: number;

  /**
   * Named lists of region names (see {@link TextureAtlas.sequences}).
   * Copied, so changing the map or its lists later doesn't change the
   * atlas. Defaults to none.
   */
  sequences?: ReadonlyMap<string, readonly string[]>;
}

const defaultCreateTextureAtlasOptions: Required<CreateTextureAtlasOptions> = {
  scale: 1,
  sequences: new Map(),
};

const validateNames = (rects: readonly AtlasRegionRect[]): void => {
  const seen = new Set<string>();

  for (const [index, { name }] of rects.entries()) {
    if (name.length === 0) {
      throw new Error(
        `Unable to create a texture atlas: the region at index ${index} has an empty name.`,
      );
    }

    if (seen.has(name)) {
      throw new Error(
        `Unable to create a texture atlas: the name "${name}" is used by more than one region.`,
      );
    }

    seen.add(name);
  }
};

const copySequences = (
  sequences: ReadonlyMap<string, readonly string[]>,
  hasRegion: (name: string) => boolean,
  names: readonly string[],
): ReadonlyMap<string, readonly string[]> => {
  const copied = new Map<string, readonly string[]>();

  for (const [sequenceName, frames] of sequences) {
    if (sequenceName.length === 0) {
      throw new Error(
        'Unable to create a texture atlas: it has a sequence with an empty name.',
      );
    }

    if (frames.length === 0) {
      throw new Error(
        `Unable to create a texture atlas: its sequence "${sequenceName}" is empty. A sequence must list at least one region.`,
      );
    }

    const missing = findMissingNames(frames, hasRegion);

    if (missing.length > 0) {
      throw new Error(
        `Unable to create a texture atlas: in its sequence "${sequenceName}", ${describeMissingRegionNames(missing, names)}`,
      );
    }

    copied.set(sequenceName, Object.freeze([...frames]));
  }

  return copied;
};

/**
 * Creates a {@link TextureAtlas} from texel rects, such as an atlas
 * packer's output. Each rect becomes an {@link AtlasRegion} whose UVs land
 * on the rect's exact texel edges, with no half-texel inset, so a sprite
 * draws the whole rect. A sprite drawing a region of a texture whose `wrap`
 * is `'clamp'` samples only inside it, so neighboring regions don't bleed
 * into each other under linear filtering, even with no spacing between
 * them.
 * @param texture - The texture the regions are cut from. Its size is read
 * now, to convert texels to UVs.
 * @param rects - The regions, in texels, measured from the texture's
 * top-left corner. Their order is kept in `regions`.
 * @param options - Optional parameters for creating the atlas.
 * @returns The atlas, frozen, along with its `regions` and every region.
 * @throws An error if the texture's `width` or `height` is `0`, `scale`
 * isn't a finite number greater than `0`, `rects` is empty, a name is empty or used twice, or a rect is invalid (a texel value
 * that isn't a whole number, a negative position, a size that isn't
 * greater than `0`, a rect outside the texture or its untrimmed frame, or a
 * pivot that isn't finite), or a sequence has an empty name, is empty, or
 * lists a name that isn't a region's.
 */
export function createTextureAtlas(
  texture: Texture,
  rects: readonly AtlasRegionRect[],
  options: CreateTextureAtlasOptions = {},
): TextureAtlas {
  const { scale, sequences: givenSequences } = withDefaults(
    defaultCreateTextureAtlasOptions,
    options,
  );

  if (texture.width === 0 || texture.height === 0) {
    throw new Error(
      `Unable to create a texture atlas: its texture is ${texture.width} x ${texture.height} texels. Create the atlas once the texture has an image.`,
    );
  }

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(
      `Unable to create a texture atlas: its scale (${scale}) must be a finite number greater than 0.`,
    );
  }

  if (rects.length === 0) {
    throw new Error(
      'Unable to create a texture atlas: it must have at least one region.',
    );
  }

  validateNames(rects);

  const regions = Object.freeze(
    rects.map((rect) => createAtlasRegion(rect, texture.width, texture.height)),
  );
  const regionsByName = new Map(regions.map((region) => [region.name, region]));
  const names = regions.map((region) => region.name);
  const sequences = copySequences(
    givenSequences,
    (name) => regionsByName.has(name),
    names,
  );
  const sequenceNames = [...sequences.keys()];

  return Object.freeze({
    texture,
    regions,
    scale,
    sequences,
    getRegion: (name: string): AtlasRegion => {
      const region = regionsByName.get(name);

      if (!region) {
        throw new Error(
          `Unable to find region "${name}" in the texture atlas. ${describeMissingName(name, names)}`,
        );
      }

      return region;
    },
    hasRegion: (name: string): boolean => regionsByName.has(name),
    getRegionAt: (index: number): AtlasRegion => {
      if (!Number.isInteger(index) || index < 0 || index >= regions.length) {
        throw new Error(
          `Unable to find the region at index ${index} in the texture atlas: the index must be a whole number from 0 to ${regions.length - 1}.`,
        );
      }

      return regions[index];
    },
    getSequence: (name: string): readonly string[] => {
      const sequence = sequences.get(name);

      if (sequence) {
        return sequence;
      }

      if (sequenceNames.length === 0) {
        throw new Error(
          `Unable to find sequence "${name}" in the texture atlas: it has no sequences.`,
        );
      }

      throw new Error(
        `Unable to find sequence "${name}" in the texture atlas. ${describeMissingName(name, sequenceNames, 'sequence')}`,
      );
    },
  });
}
