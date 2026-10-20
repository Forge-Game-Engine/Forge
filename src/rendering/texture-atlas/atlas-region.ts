import type { Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { createTextureRegion, type TextureRegion } from '../texture-region.js';

/**
 * A named region of a {@link TextureAtlas}: a {@link TextureRegion} plus the
 * texel data a sprite made from it needs. Immutable, and shared by every
 * sprite, animation clip and tile that draws it.
 *
 * `sourceSize` and `pivot` are read once, by `createAtlasSprite`, to size
 * and place the sprite. A sprite animation only assigns each frame's region
 * to the sprite's `region`, with its clip's texture, so the frames of one
 * clip draw inside the size and pivot of the sprite they play on;
 * `createAtlasAnimationClip` rejects frames whose untrimmed size or pivot
 * differ.
 */
export interface AtlasRegion extends TextureRegion {
  /**
   * The region's name, unique within its atlas. Grid atlases name their
   * regions by index: `'0'`, `'1'`, ...
   */
  readonly name: string;

  /**
   * The size of the untrimmed frame, in texels. Equal to the packed rect's
   * size for an untrimmed region.
   */
  readonly sourceSize: Readonly<Vector2>;

  /**
   * The sprite's origin, normalized to the untrimmed frame like
   * `SpriteEcsComponent.pivot`: `(0, 0)` is the frame's top-left corner and
   * `(0.5, 0.5)` its center (Y-down). It may lie outside `0` to `1`.
   */
  readonly pivot: Readonly<Vector2>;
}

/**
 * One region of a texture atlas in texels, measured from the texture's
 * top-left corner, as atlas packers write them. Passed to
 * `createTextureAtlas`.
 */
export interface AtlasRegionRect {
  /**
   * The region's name, unique within its atlas.
   */
  name: string;

  /**
   * The left edge of the packed (drawn) rect in the texture, in texels.
   */
  x: number;

  /**
   * The top edge of the packed (drawn) rect in the texture, in texels.
   */
  y: number;

  /**
   * The width of the packed (drawn) rect, in texels.
   */
  width: number;

  /**
   * The height of the packed (drawn) rect, in texels.
   */
  height: number;

  /**
   * The width of the untrimmed frame, in texels. Defaults to `width` (an
   * untrimmed region).
   */
  sourceWidth?: number;

  /**
   * The height of the untrimmed frame, in texels. Defaults to `height` (an
   * untrimmed region).
   */
  sourceHeight?: number;

  /**
   * How far the packed rect's left edge is from the untrimmed frame's left
   * edge, in texels. Defaults to `0`.
   */
  trimX?: number;

  /**
   * How far the packed rect's top edge is from the untrimmed frame's top
   * edge, in texels. Defaults to `0`.
   */
  trimY?: number;

  /**
   * The sprite's origin, normalized to the untrimmed frame, Y-down: `(0, 0)`
   * is its top-left corner. Defaults to `(0.5, 0.5)`, the frame's center.
   */
  pivot?: Vector2;
}

const describeRegion = (name: string): string =>
  `Unable to create texture atlas region "${name}"`;

const validateWholeTexels = (
  name: string,
  values: Record<string, number>,
): void => {
  for (const [field, value] of Object.entries(values)) {
    if (!Number.isInteger(value)) {
      throw new Error(
        `${describeRegion(name)}: its ${field} (${value}) isn't a whole number of texels.`,
      );
    }
  }
};

const validateNotNegative = (
  name: string,
  values: Record<string, number>,
): void => {
  for (const [field, value] of Object.entries(values)) {
    if (value < 0) {
      throw new Error(
        `${describeRegion(name)}: its ${field} (${value}) can't be negative.`,
      );
    }
  }
};

const validatePositive = (
  name: string,
  values: Record<string, number>,
): void => {
  for (const [field, value] of Object.entries(values)) {
    if (value <= 0) {
      throw new Error(
        `${describeRegion(name)}: its ${field} (${value}) must be greater than 0.`,
      );
    }
  }
};

interface AxisSpan {
  startField: string;
  start: number;
  sizeField: string;
  size: number;
}

const validateSpanFits = (
  name: string,
  { startField, start, sizeField, size }: AxisSpan,
  limit: number,
  limitDescription: string,
): void => {
  if (start + size > limit) {
    throw new Error(
      `${describeRegion(name)}: its rect (${startField} ${start}, ${sizeField} ${size}) reaches past ${limitDescription} of ${limit} texels.`,
    );
  }
};

/**
 * Converts one texel rect into a frozen {@link AtlasRegion} of a texture of
 * the given size. The UVs land on exact texel edges, with no inset.
 * @param rect - The region's rect, in texels.
 * @param textureWidth - The atlas texture's width, in texels.
 * @param textureHeight - The atlas texture's height, in texels.
 * @returns The region.
 * @throws An error, naming the region, if a texel value isn't a whole
 * number, a position is negative, a size isn't greater than `0`, the packed
 * rect reaches outside the texture or its untrimmed frame, or the pivot
 * isn't finite.
 */
export function createAtlasRegion(
  rect: AtlasRegionRect,
  textureWidth: number,
  textureHeight: number,
): AtlasRegion {
  const defaultAtlasRegionRect = {
    sourceWidth: rect.width,
    sourceHeight: rect.height,
    trimX: 0,
    trimY: 0,
    pivot: { x: 0.5, y: 0.5 },
  };

  const {
    name,
    x,
    y,
    width,
    height,
    sourceWidth,
    sourceHeight,
    trimX,
    trimY,
    pivot,
  } = withDefaults(defaultAtlasRegionRect, rect);

  validateWholeTexels(name, {
    x,
    y,
    width,
    height,
    sourceWidth,
    sourceHeight,
    trimX,
    trimY,
  });
  validateNotNegative(name, { x, y, trimX, trimY });
  validatePositive(name, { width, height, sourceWidth, sourceHeight });

  const xSpan = { startField: 'x', start: x, sizeField: 'width', size: width };
  const ySpan = {
    startField: 'y',
    start: y,
    sizeField: 'height',
    size: height,
  };

  validateSpanFits(name, xSpan, textureWidth, "the texture's width");
  validateSpanFits(name, ySpan, textureHeight, "the texture's height");
  validateSpanFits(
    name,
    { ...xSpan, startField: 'trimX', start: trimX },
    sourceWidth,
    "its untrimmed frame's width",
  );
  validateSpanFits(
    name,
    { ...ySpan, startField: 'trimY', start: trimY },
    sourceHeight,
    "its untrimmed frame's height",
  );

  if (!Number.isFinite(pivot.x) || !Number.isFinite(pivot.y)) {
    throw new Error(
      `${describeRegion(name)}: its pivot (${pivot.x}, ${pivot.y}) has a value that isn't a finite number.`,
    );
  }

  const region = createTextureRegion(
    { x: x / textureWidth, y: y / textureHeight },
    { x: width / textureWidth, y: height / textureHeight },
    {
      offset: { x: trimX / sourceWidth, y: trimY / sourceHeight },
      scale: { x: width / sourceWidth, y: height / sourceHeight },
    },
  );

  return Object.freeze({
    ...region,
    name,
    sourceSize: Object.freeze({ x: sourceWidth, y: sourceHeight }),
    pivot: Object.freeze({ x: pivot.x, y: pivot.y }),
  });
}
