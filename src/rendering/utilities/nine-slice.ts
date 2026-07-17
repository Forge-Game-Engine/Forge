import { Vector2 } from '../../math/index.js';

/**
 * How the stretchable regions of a nine-sliced sprite are filled.
 *
 * Declared as a literal union (rather than a bare `string`) so additional
 * modes can be added later without a breaking change. `'stretch'` is the
 * only value in v1 and the default: the edges and center are stretched to
 * fill the sprite. `'tile'` (repeating the source region instead of
 * stretching it) is intentionally deferred.
 */
export type SliceMode = 'stretch';

/**
 * The border insets, in texture pixels, that split a sprite's texture into
 * the classic nine-slice grid (four corners, four edges and a center).
 *
 * This is the industry-standard convention shared by Unity's 9-slice, CSS
 * `border-image` and Godot's `NinePatchRect`: `left`/`right` measure in from
 * the texture's left/right edges and `top`/`bottom` from its top/bottom
 * edges. The corners keep their native size, the edges stretch along a single
 * axis and the center stretches along both.
 */
export interface NineSliceInsets {
  /** Distance, in texture pixels, of the left column of slices. */
  left: number;

  /** Distance, in texture pixels, of the right column of slices. */
  right: number;

  /** Distance, in texture pixels, of the top row of slices. */
  top: number;

  /** Distance, in texture pixels, of the bottom row of slices. */
  bottom: number;
}

/**
 * A single sub-quad of a nine-sliced sprite, expressed in the exact terms the
 * standard sprite pipeline already consumes per instance. Emitting one of
 * these per non-empty slice lets a sliced sprite reuse the shared sprite
 * vertex shader unchanged: each sub-quad is just another instance with its
 * own size, pivot and texture region, sharing the parent sprite's position,
 * rotation, scale and tint.
 */
export interface NineSliceInstance {
  /** The sub-quad's world size (width, height). */
  size: Vector2;

  /**
   * The sub-quad's pivot, encoded so that the shared sprite shader places the
   * sub-quad at its correct offset within the parent sprite while still
   * pivoting, rotating and scaling around the parent sprite's origin. May lie
   * outside `[0, 1]`; it is a positional encoding, not a user-facing pivot.
   */
  pivot: Vector2;

  /** The top-left of the sub-quad's texture region, in normalized UV space. */
  uvOffset: Vector2;

  /** The size of the sub-quad's texture region, in normalized UV space. */
  uvScale: Vector2;
}

/**
 * The inputs needed to expand a nine-sliced sprite into its sub-quads.
 */
export interface NineSliceParams {
  /** The sprite's current world width. */
  width: number;

  /** The sprite's current world height. */
  height: number;

  /** The source texture (or sampled frame) width, in pixels. */
  textureWidth: number;

  /** The source texture (or sampled frame) height, in pixels. */
  textureHeight: number;

  /** The border insets, in texture pixels. */
  insets: NineSliceInsets;

  /** The parent sprite's pivot, normalized to its size. */
  pivot: Vector2;

  /** The parent sprite's texture region offset, in normalized UV space. */
  uvOffset: Vector2;

  /** The parent sprite's texture region size, in normalized UV space. */
  uvScale: Vector2;
}

/**
 * A single-axis slice segment, in the terms the sprite shader consumes.
 */
interface AxisSegment {
  /** The segment's world size along this axis. */
  size: number;

  /** The pivot encoding that positions the segment along this axis. */
  pivot: number;

  /** The segment's texture region offset along this axis (normalized). */
  uvOffset: number;

  /** The segment's texture region size along this axis (normalized). */
  uvScale: number;
}

/**
 * Validates a set of nine-slice insets against the texture they refer to.
 * @param insets - The insets to validate, in texture pixels.
 * @param textureWidth - The source texture width, in pixels.
 * @param textureHeight - The source texture height, in pixels.
 * @throws An error if any inset is negative, or if the horizontal or vertical
 * insets meet or overlap (i.e. leave no room for a center slice).
 */
export function validateNineSliceInsets(
  insets: NineSliceInsets,
  textureWidth: number,
  textureHeight: number,
): void {
  const { left, right, top, bottom } = insets;

  if (left < 0 || right < 0 || top < 0 || bottom < 0) {
    throw new Error(
      `Nine-slice insets must be non-negative, but got left=${left}, right=${right}, top=${top}, bottom=${bottom}.`,
    );
  }

  if (left + right >= textureWidth) {
    throw new Error(
      `Nine-slice horizontal insets (left=${left} + right=${right}) must be less than the texture width (${textureWidth}).`,
    );
  }

  if (top + bottom >= textureHeight) {
    throw new Error(
      `Nine-slice vertical insets (top=${top} + bottom=${bottom}) must be less than the texture height (${textureHeight}).`,
    );
  }
}

/**
 * Splits one axis into up to three segments (start border, stretchable
 * middle, end border), skipping any segment with no size so that a zero inset
 * collapses cleanly instead of emitting a degenerate zero-area quad.
 */
function sliceAxis(
  fullSize: number,
  pivot: number,
  textureSize: number,
  insetStart: number,
  insetEnd: number,
  baseUvOffset: number,
  baseUvScale: number,
): AxisSegment[] {
  // Cumulative geometry edges, in world units, from the axis' start edge:
  // the two borders keep their native (inset) size and the middle absorbs
  // whatever world size is left over.
  const geometryEdges = [0, insetStart, fullSize - insetEnd, fullSize];

  // Cumulative texture edges, as normalized fractions of the sampled region:
  // unlike the geometry, the borders keep their texture fraction and the
  // middle is the fraction left over, so the border texels never stretch.
  const textureEdges = [
    0,
    insetStart / textureSize,
    (textureSize - insetEnd) / textureSize,
    1,
  ];

  // The world-space position of this axis' start edge relative to the parent
  // sprite's pivot origin, matching the sprite shader's own pivot math
  // (`(a_position - (pivot - 0.5)) * size * 0.5`).
  const startEdge = (-0.5 - pivot) * fullSize * 0.5;

  const segments: AxisSegment[] = [];

  for (let i = 0; i < 3; i++) {
    const size = geometryEdges[i + 1] - geometryEdges[i];

    if (size <= 0) {
      continue;
    }

    const segmentStart = startEdge + geometryEdges[i];

    segments.push({
      size,
      // Solve the shader's pivot math for the pivot that lands this segment's
      // start edge at `segmentStart` given its `size`.
      pivot: -0.5 - (2 * segmentStart) / size,
      uvOffset: baseUvOffset + textureEdges[i] * baseUvScale,
      uvScale: (textureEdges[i + 1] - textureEdges[i]) * baseUvScale,
    });
  }

  return segments;
}

/**
 * Expands a nine-sliced sprite into the sub-quads that render it, computed
 * from the sprite's current size, its texture dimensions and the insets.
 *
 * Corners keep their native (inset) world size, edges stretch along one axis
 * and the center stretches along both, all expressed as sprite-shader
 * instances so no shader change is needed. With non-zero insets on both axes
 * this returns nine instances, ordered top-to-bottom then left-to-right; a
 * zero inset collapses the affected row/column, so fewer instances are
 * returned (for example, insets of zero on both axes return a single instance
 * identical to the un-sliced sprite).
 * @param params - The sprite size, texture dimensions, insets, pivot and
 * texture region.
 * @returns The sub-quad instances, in row-major (top-to-bottom,
 * left-to-right) order.
 */
export function computeNineSliceInstances(
  params: NineSliceParams,
): NineSliceInstance[] {
  const {
    width,
    height,
    textureWidth,
    textureHeight,
    insets,
    pivot,
    uvOffset,
    uvScale,
  } = params;

  const columns = sliceAxis(
    width,
    pivot.x,
    textureWidth,
    insets.left,
    insets.right,
    uvOffset.x,
    uvScale.x,
  );

  const rows = sliceAxis(
    height,
    pivot.y,
    textureHeight,
    insets.top,
    insets.bottom,
    uvOffset.y,
    uvScale.y,
  );

  const instances: NineSliceInstance[] = [];

  for (const row of rows) {
    for (const column of columns) {
      instances.push({
        size: new Vector2(column.size, row.size),
        pivot: new Vector2(column.pivot, row.pivot),
        uvOffset: new Vector2(column.uvOffset, row.uvOffset),
        uvScale: new Vector2(column.uvScale, row.uvScale),
      });
    }
  }

  return instances;
}
