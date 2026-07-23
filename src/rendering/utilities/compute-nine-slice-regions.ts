import { Vector2 } from '../../math/index.js';
import { NineSliceOptions, SliceScaleMode } from '../nine-slice-options.js';

/**
 * A single quad, in a sliced sprite's own local sprite-space, that the
 * render system draws in place of the sprite's single quad when it has
 * `NineSliceOptions` set.
 */
export interface NineSliceRegion {
  /**
   * This region's center, as an offset from the sprite's pivot-adjusted
   * anchor point, in the sprite's unscaled local units (before rotation and
   * `ScaleEcsComponent` are applied).
   */
  offset: Vector2;

  /** This region's rendered width/height, in the same unscaled units. */
  size: Vector2;

  /** The top-left corner of this region's texture rect, 0 to 1. */
  uvOffset: Vector2;

  /** The width/height of this region's texture rect, 0 to 1. */
  uvScale: Vector2;
}

const EPSILON = 1e-5;

/**
 * Scales down `near`/`far` proportionally so they never overlap (sum to more
 * than `total`), the same way an over-sized pair of nine-slice borders is
 * clamped so the corners meet in the middle instead of the center inverting.
 */
function clampInsets(
  near: number,
  far: number,
  total: number,
): [number, number] {
  if (total <= 0) {
    return [0, 0];
  }

  const sum = near + far;

  if (sum <= total) {
    return [near, far];
  }

  const factor = total / sum;

  return [near * factor, far * factor];
}

interface Band {
  /** This band's start coordinate, in unscaled sprite-space units. */
  start: number;

  /** This band's current (possibly resized) size. */
  size: number;

  /** This band's original (not-yet-resized) size, used to derive tile counts. */
  nativeSize: number;

  /** The top-left of this band's texture rect, 0 to 1. */
  uvStart: number;

  /** The width/height of this band's texture rect, 0 to 1. */
  uvSize: number;

  /** Whether this band is the center band (the one that can stretch/tile). */
  stretches: boolean;
}

/**
 * Splits one axis (width or height) into up to three bands: a near border
 * (left/top), a center band, and a far border (right/bottom).
 */
function createAxisBands(
  size: number,
  nativeSize: number,
  near: number,
  far: number,
  uvOffset: number,
  uvScale: number,
): Band[] {
  const [clampedNear, clampedFar] = clampInsets(near, far, size);
  const [nativeNear, nativeFar] = clampInsets(near, far, nativeSize);

  const nearUvSize = nativeSize > 0 ? (nativeNear / nativeSize) * uvScale : 0;
  const farUvSize = nativeSize > 0 ? (nativeFar / nativeSize) * uvScale : 0;

  const bands: Band[] = [];

  if (clampedNear > EPSILON) {
    bands.push({
      start: 0,
      size: clampedNear,
      nativeSize: clampedNear,
      uvStart: uvOffset,
      uvSize: nearUvSize,
      stretches: false,
    });
  }

  const centerSize = size - clampedNear - clampedFar;

  if (centerSize > EPSILON) {
    bands.push({
      start: clampedNear,
      size: centerSize,
      nativeSize: Math.max(0, nativeSize - nativeNear - nativeFar),
      uvStart: uvOffset + nearUvSize,
      uvSize: uvScale - nearUvSize - farUvSize,
      stretches: true,
    });
  }

  if (clampedFar > EPSILON) {
    bands.push({
      start: size - clampedFar,
      size: clampedFar,
      nativeSize: clampedFar,
      uvStart: uvOffset + uvScale - farUvSize,
      uvSize: farUvSize,
      stretches: false,
    });
  }

  return bands;
}

interface Segment {
  start: number;
  size: number;
}

/**
 * Splits a band into one or more equally-sized segments along its own axis.
 * `'stretch'` (and any non-stretching band, i.e. a border) always yields a
 * single segment spanning the whole band. `'tile'` yields
 * `round(band.size / band.nativeSize)` equal segments (at least one), each
 * sampling the band's full texture rect - a "round" repeat that fills the
 * band evenly with whole tiles instead of cropping a partial tile at the end.
 */
function subdivideBand(band: Band, mode: SliceScaleMode): Segment[] {
  if (mode === 'stretch' || !band.stretches || band.nativeSize <= EPSILON) {
    return [{ start: band.start, size: band.size }];
  }

  const tileCount = Math.max(1, Math.round(band.size / band.nativeSize));
  const segmentSize = band.size / tileCount;

  return Array.from({ length: tileCount }, (_, index) => ({
    start: band.start + index * segmentSize,
    size: segmentSize,
  }));
}

/**
 * Builds the regions for a single grid cell (one x band crossed with one y
 * band), subdividing into tiled segments per axis where that axis' mode is
 * `'tile'`.
 */
function createCellRegions(
  xBand: Band,
  yBand: Band,
  edgeMode: SliceScaleMode,
  centerMode: SliceScaleMode,
  pivot: Vector2,
  width: number,
  height: number,
): NineSliceRegion[] {
  const mode = xBand.stretches && yBand.stretches ? centerMode : edgeMode;
  const xSegments = subdivideBand(xBand, mode);
  const ySegments = subdivideBand(yBand, mode);
  const regions: NineSliceRegion[] = [];

  for (const xSegment of xSegments) {
    for (const ySegment of ySegments) {
      regions.push({
        offset: new Vector2(
          xSegment.start + xSegment.size / 2 - pivot.x * width,
          // Negated relative to x (written as a subtraction, not unary `-`,
          // so a zero result stays +0 rather than -0): sprite instance data
          // negates world.y again before it reaches the shader (see
          // bindSpriteInstanceData), to convert this sprite-space, Y-down
          // offset (near/top bands start at 0, far/bottom bands end at
          // `height`) into the engine's Y-up world space. Without this, a
          // region's own offset and its parent entity's position would be
          // negated a different number of times, landing near/top bands at
          // the far/bottom edge and vice versa.
          pivot.y * height - (ySegment.start + ySegment.size / 2),
        ),
        size: new Vector2(xSegment.size, ySegment.size),
        uvOffset: new Vector2(xBand.uvStart, yBand.uvStart),
        uvScale: new Vector2(xBand.uvSize, yBand.uvSize),
      });
    }
  }

  return regions;
}

/**
 * Computes the nine-slice regions for a sprite, given its current size, and
 * cuts each stretching band into tiled segments where its mode is `'tile'`.
 *
 * Corner regions are always a single, fixed-size quad. Edge regions stretch
 * or tile along their one free axis (`edgeMode`); the center region
 * stretches or tiles along both axes (`centerMode`). A border with an inset
 * of `0` (the default for any axis with no slicing) collapses to just its
 * center band, so a sprite with no insets at all degenerates to the single
 * region a non-sliced sprite would render.
 * @param width - The sprite's current width, in unscaled sprite-space units.
 * @param height - The sprite's current height, in unscaled sprite-space units.
 * @param pivot - The sprite's pivot, normalized to its own size.
 * @param uvOffset - The sprite's texture rect offset, 0 to 1.
 * @param uvScale - The sprite's texture rect size, 0 to 1.
 * @param slices - The nine-slice configuration.
 * @returns Up to nine regions, each a quad to draw in place of the sprite's
 * single quad.
 */
export function computeNineSliceRegions(
  width: number,
  height: number,
  pivot: Vector2,
  uvOffset: Vector2,
  uvScale: Vector2,
  slices: NineSliceOptions,
): NineSliceRegion[] {
  const {
    left,
    right,
    top,
    bottom,
    edgeMode = 'stretch',
    centerMode = 'stretch',
    nativeWidth = width,
    nativeHeight = height,
  } = slices;

  const xBands = createAxisBands(
    width,
    nativeWidth,
    left,
    right,
    uvOffset.x,
    uvScale.x,
  );
  const yBands = createAxisBands(
    height,
    nativeHeight,
    top,
    bottom,
    uvOffset.y,
    uvScale.y,
  );

  const regions: NineSliceRegion[] = [];

  for (const xBand of xBands) {
    for (const yBand of yBands) {
      regions.push(
        ...createCellRegions(
          xBand,
          yBand,
          edgeMode,
          centerMode,
          pivot,
          width,
          height,
        ),
      );
    }
  }

  return regions;
}
