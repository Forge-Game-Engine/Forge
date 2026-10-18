import type { Vector2 } from '../math/index.js';

/**
 * The part of a texture a sprite draws, and where that part sits in the
 * untrimmed frame it was cut from.
 *
 * Atlas packers trim the transparent border off each frame to pack them
 * tighter. A trimmed region samples only the trimmed rect (`uvOffset`,
 * `uvScale`) and draws it at its place inside the untrimmed frame
 * (`trimOffset`, `trimScale`), so a sprite keeps the untrimmed frame's
 * size and pivot and its art doesn't move when it switches between frames
 * trimmed by different amounts.
 *
 * Regions are immutable and meant to be shared: to change what a sprite
 * draws, assign it another region instead of changing the one it has.
 * Create one with {@link createTextureRegion}.
 */
export interface TextureRegion {
  /**
   * The top-left corner of the sampled rect, as a fraction of the texture's
   * size. Y-down: `y = 0` is the top of the texture.
   */
  readonly uvOffset: Readonly<Vector2>;

  /**
   * The size of the sampled rect, as a fraction of the texture's size:
   * `(1, 1)` is the whole texture.
   */
  readonly uvScale: Readonly<Vector2>;

  /**
   * The top-left corner of the drawn (trimmed) rect inside the untrimmed
   * frame, as a fraction (`0` to `1`) of the frame's size. Y-down. `(0, 0)`
   * when untrimmed.
   */
  readonly trimOffset: Readonly<Vector2>;

  /**
   * The size of the drawn (trimmed) rect, as a fraction (`0` to `1`) of the
   * untrimmed frame's size. `(1, 1)` when untrimmed.
   */
  readonly trimScale: Readonly<Vector2>;
}

/**
 * Where a trimmed rect sits inside its untrimmed frame, for
 * {@link createTextureRegion}.
 */
export interface TextureRegionTrim {
  /**
   * The top-left corner of the trimmed rect inside the untrimmed frame, as a
   * fraction (`0` to `1`) of the frame's size. Y-down.
   */
  offset: Vector2;

  /**
   * The size of the trimmed rect, as a fraction (`0` to `1`) of the
   * untrimmed frame's size.
   */
  scale: Vector2;
}

// Fractions computed from texel counts (`column * frameWidth / width`)
// can land a rounding error past `1`, which isn't outside the frame.
const EPSILON = 1e-6;

const freezeVector = (vector: Vector2): Readonly<Vector2> =>
  Object.freeze({ x: vector.x, y: vector.y });

const describeRect = (offset: Vector2, scale: Vector2): string =>
  `offset (${offset.x}, ${offset.y}), scale (${scale.x}, ${scale.y})`;

const validateRect = (name: string, offset: Vector2, scale: Vector2): void => {
  const values = [offset.x, offset.y, scale.x, scale.y];

  if (!values.every(Number.isFinite)) {
    throw new Error(
      `Unable to create a texture region: its ${name} rect (${describeRect(offset, scale)}) has a value that isn't a finite number.`,
    );
  }

  if (scale.x <= 0 || scale.y <= 0) {
    throw new Error(
      `Unable to create a texture region: its ${name} rect (${describeRect(offset, scale)}) must have a scale greater than 0 on both axes.`,
    );
  }
};

const validateTrimInsideFrame = (offset: Vector2, scale: Vector2): void => {
  if (
    offset.x < -EPSILON ||
    offset.y < -EPSILON ||
    offset.x + scale.x > 1 + EPSILON ||
    offset.y + scale.y > 1 + EPSILON
  ) {
    throw new Error(
      `Unable to create a texture region: its trim rect (${describeRect(offset, scale)}) must stay inside its untrimmed frame, 0 to 1 on both axes.`,
    );
  }
};

const untrimmed: TextureRegionTrim = {
  offset: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
};

/**
 * Creates a frozen {@link TextureRegion}.
 * @param uvOffset - The top-left corner of the sampled rect, as a fraction
 * of the texture's size. Y-down.
 * @param uvScale - The size of the sampled rect, as a fraction of the
 * texture's size. The UV rect isn't limited to `0` to `1`: on a texture
 * whose `wrap` is `'repeat'`, a scale above `1` tiles it and an offset
 * past `1` scrolls it.
 * @param trim - Where the sampled rect sits inside the untrimmed frame.
 * Omit for an untrimmed region, which fills the whole frame.
 * @returns The region. Its vectors are copies, so changing the arguments
 * afterwards doesn't change it.
 * @throws An error if a value isn't finite, a scale isn't greater than `0`,
 * or the trim rect reaches outside `0` to `1`.
 */
export function createTextureRegion(
  uvOffset: Vector2,
  uvScale: Vector2,
  trim: TextureRegionTrim = untrimmed,
): TextureRegion {
  validateRect('UV', uvOffset, uvScale);
  validateRect('trim', trim.offset, trim.scale);
  validateTrimInsideFrame(trim.offset, trim.scale);

  return Object.freeze({
    uvOffset: freezeVector(uvOffset),
    uvScale: freezeVector(uvScale),
    trimOffset: freezeVector(trim.offset),
    trimScale: freezeVector(trim.scale),
  });
}

/**
 * The whole texture, untrimmed: the region a sprite draws unless it's given
 * another.
 */
export const fullTextureRegion: TextureRegion = createTextureRegion(
  { x: 0, y: 0 },
  { x: 1, y: 1 },
);

/**
 * Whether `region` is trimmed, i.e. draws less than its whole untrimmed
 * frame.
 * @param region - The region to check.
 * @returns `true` if `region.trimScale` isn't `(1, 1)`, within the same
 * rounding tolerance `createTextureRegion` allows.
 */
export function isTextureRegionTrimmed(region: TextureRegion): boolean {
  return (
    Math.abs(region.trimScale.x - 1) > EPSILON ||
    Math.abs(region.trimScale.y - 1) > EPSILON
  );
}
