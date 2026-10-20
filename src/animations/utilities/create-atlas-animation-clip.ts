import type { AtlasRegion } from '../../rendering/texture-atlas/atlas-region.js';
import {
  describeMissingRegionNames,
  findMissingNames,
} from '../../rendering/texture-atlas/suggest-names.js';
import type { TextureAtlas } from '../../rendering/texture-atlas/texture-atlas.js';
import { AnimationClip } from '../types/index.js';

const describeError = 'Unable to create an animation clip';

const validateFrameShapes = (regions: readonly AtlasRegion[]): void => {
  const [first] = regions;

  for (const region of regions) {
    if (
      region.sourceSize.x !== first.sourceSize.x ||
      region.sourceSize.y !== first.sourceSize.y
    ) {
      throw new Error(
        `${describeError}: its frames "${first.name}" (${first.sourceSize.x} x ${first.sourceSize.y} texels) and "${region.name}" (${region.sourceSize.x} x ${region.sourceSize.y} texels) have different untrimmed sizes. A sprite draws every frame of its clip inside one size; export the animation's frames from canvases of one size.`,
      );
    }

    if (region.pivot.x !== first.pivot.x || region.pivot.y !== first.pivot.y) {
      throw new Error(
        `${describeError}: its frames "${first.name}" and "${region.name}" have different pivots ((${first.pivot.x}, ${first.pivot.y}) and (${region.pivot.x}, ${region.pivot.y})). A sprite draws every frame of its clip around one pivot; give the frames one pivot.`,
      );
    }
  }
};

/**
 * Creates an animation clip from regions of one atlas, in the order given.
 * The clip's texture is the atlas's texture, which the sprite animation
 * system draws the sprite with while it plays the clip. Address a grid
 * atlas's frames by index and a packed atlas's by name, from
 * `getAtlasRegionNames` or `atlas.getSequence`.
 *
 * A sprite draws every frame of its clip inside the untrimmed size and
 * around the pivot it was created with, so the frames must share one
 * untrimmed size and pivot. Create the sprite from one of the clip's
 * frames.
 * @param atlas - The atlas the frames are regions of.
 * @param frames - Each frame's region name, or its index in
 * `atlas.regions`. A region may appear more than once, to hold a frame.
 * @returns The clip.
 * @throws An error if `frames` is empty, a name isn't a region's (listing
 * every missing name, each with close names), an index isn't one of
 * `atlas.regions`, or the frames' untrimmed sizes or pivots differ.
 */
export function createAtlasAnimationClip(
  atlas: TextureAtlas,
  frames: readonly (string | number)[],
): AnimationClip {
  if (frames.length === 0) {
    throw new Error(`${describeError}: it must have at least one frame.`);
  }

  const missing = findMissingNames(frames, (name) => atlas.hasRegion(name));

  if (missing.length > 0) {
    const names = atlas.regions.map(({ name }) => name);

    throw new Error(
      `${describeError}: ${describeMissingRegionNames(missing, names)}`,
    );
  }

  const regions = frames.map((frame) =>
    typeof frame === 'number'
      ? atlas.getRegionAt(frame)
      : atlas.getRegion(frame),
  );

  validateFrameShapes(regions);

  return new AnimationClip(atlas.texture, regions);
}
