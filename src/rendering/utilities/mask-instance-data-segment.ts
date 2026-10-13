import type { InstanceComponents, Renderable } from '../renderable.js';
import type { InstanceDataSegment } from './instance-data-segment.js';
import type {
  InstanceMask,
  InstanceShapeMask,
} from './resolve-instance-mask.js';
import { setupInstanceAttribute } from './setup-instance-attribute.js';

/** Where the clip rect (a `vec4`) starts in the mask data. */
export const CLIP_MIN_X_OFFSET = 0;
const CLIP_MIN_Y_OFFSET = 1;
const CLIP_MAX_X_OFFSET = 2;
const CLIP_MAX_Y_OFFSET = 3;
/** Where the shape mask's axes (a `vec4`) start in the mask data. */
export const AXES_XX_OFFSET = 4;
const AXES_XY_OFFSET = 5;
const AXES_YX_OFFSET = 6;
const AXES_YY_OFFSET = 7;
/** Where the shape mask's origin (a `vec2`) starts in the mask data. */
export const ORIGIN_X_OFFSET = 8;
const ORIGIN_Y_OFFSET = 9;
/** Where the shape's mode and parameters (a `vec4`) start in the mask data. */
export const SHAPE_MODE_OFFSET = 10;
const SHAPE_PARAMETER_0_OFFSET = 11;
const SHAPE_PARAMETER_1_OFFSET = 12;
const SHAPE_PARAMETER_2_OFFSET = 13;

/**
 * The shape modes `maskCoverage` switches on, offset by
 * `CLIPPED_MODE_OFFSET` when a rect mask clips the instance, so an
 * instance without one skips the clip test.
 */
const SHAPE_MODE_NONE = 0;
const SHAPE_MODE_LINEAR = 1;
const SHAPE_MODE_RADIAL = 2;
const CLIPPED_MODE_OFFSET = 3;

/**
 * Stands in for an unbounded clip rect edge. Finite, so the shader's
 * distance arithmetic stays finite, and far beyond any world coordinate.
 */
const UNBOUNDED_EDGE = 1e30;

/** The number of floats occupied by an instance's mask data. */
export const MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE = 14;

const toShaderCoordinate = (value: number): number =>
  Math.min(Math.max(value, -UNBOUNDED_EDGE), UNBOUNDED_EDGE);

/**
 * The sign of Y in the world a shader receives mask data in: `-1` for the
 * sprite and glyph instance data, which is Y-down (see
 * `bindSpriteInstanceData`), `1` for meshes, which are drawn in the
 * engine's Y-up world. Mask coverage only depends on distances and mask
 * coordinates, which come out the same either way, as long as the mask data
 * and the positions it's tested against share the same Y direction.
 */
export type MaskDataYSign = 1 | -1;

function bindShapeMask(
  shape: InstanceShapeMask,
  buffer: Float32Array,
  offset: number,
  modeOffset: number,
  ySign: MaskDataYSign,
): void {
  const { origin, axes } = shape;

  // In a Y-down world, the Y input of the axes and the origin's Y are
  // negated.
  buffer[offset + AXES_XX_OFFSET] = axes.xx;
  buffer[offset + AXES_XY_OFFSET] = ySign * axes.xy;
  buffer[offset + AXES_YX_OFFSET] = axes.yx;
  buffer[offset + AXES_YY_OFFSET] = ySign * axes.yy;
  buffer[offset + ORIGIN_X_OFFSET] = origin.x;
  buffer[offset + ORIGIN_Y_OFFSET] = ySign * origin.y;

  if (shape.kind === 'linear') {
    buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_LINEAR + modeOffset;
    buffer[offset + SHAPE_PARAMETER_0_OFFSET] = shape.edge;
    buffer[offset + SHAPE_PARAMETER_1_OFFSET] = 0;
    buffer[offset + SHAPE_PARAMETER_2_OFFSET] = 0;

    return;
  }

  buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_RADIAL + modeOffset;
  buffer[offset + SHAPE_PARAMETER_0_OFFSET] = shape.startAngle;
  buffer[offset + SHAPE_PARAMETER_1_OFFSET] = shape.filledSweep;
  buffer[offset + SHAPE_PARAMETER_2_OFFSET] = shape.aspect;
}

/**
 * The data every unmasked instance binds: an unbounded clip rect and no
 * shape. Copied in one call, since most instances aren't masked.
 */
const unmaskedInstanceData = new Float32Array(
  MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
);

unmaskedInstanceData[CLIP_MIN_X_OFFSET] = -UNBOUNDED_EDGE;
unmaskedInstanceData[CLIP_MIN_Y_OFFSET] = -UNBOUNDED_EDGE;
unmaskedInstanceData[CLIP_MAX_X_OFFSET] = UNBOUNDED_EDGE;
unmaskedInstanceData[CLIP_MAX_Y_OFFSET] = UNBOUNDED_EDGE;
unmaskedInstanceData[SHAPE_MODE_OFFSET] = SHAPE_MODE_NONE;

/**
 * Writes the mask data the `mask` shader include tests fragments against:
 * the clip rect of the rect masks (min.xy, max.xy), the shape mask's axes
 * (by row) and origin, and the shape's mode and parameters, in
 * {@link MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE} floats. `null` writes an
 * unbounded clip rect and no shape.
 * @param mask - The masks to write, or `null` for none.
 * @param buffer - The buffer to write into.
 * @param offset - The index of the first float to write.
 * @param ySign - The sign of Y in the world the shader tests positions in.
 */
export function writeMaskData(
  mask: InstanceMask | null,
  buffer: Float32Array,
  offset: number,
  ySign: MaskDataYSign,
): void {
  if (!mask) {
    buffer.set(unmaskedInstanceData, offset);

    return;
  }

  const { clip } = mask;
  // Rect masks bound all four edges, so one tells whether there is any.
  const modeOffset = Number.isFinite(clip.min.x) ? CLIPPED_MODE_OFFSET : 0;
  // In a Y-down world, the clip rect's top edge becomes its minimum.
  const minY = ySign === 1 ? clip.min.y : -clip.max.y;
  const maxY = ySign === 1 ? clip.max.y : -clip.min.y;

  buffer[offset + CLIP_MIN_X_OFFSET] = toShaderCoordinate(clip.min.x);
  buffer[offset + CLIP_MIN_Y_OFFSET] = toShaderCoordinate(minY);
  buffer[offset + CLIP_MAX_X_OFFSET] = toShaderCoordinate(clip.max.x);
  buffer[offset + CLIP_MAX_Y_OFFSET] = toShaderCoordinate(maxY);

  if (mask.shape) {
    bindShapeMask(mask.shape, buffer, offset, modeOffset, ySign);

    return;
  }

  buffer.set(
    unmaskedInstanceData.subarray(AXES_XX_OFFSET),
    offset + AXES_XX_OFFSET,
  );
  buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_NONE + modeOffset;
}

function bindMaskInstanceData(
  components: InstanceComponents,
  buffer: Float32Array,
  offset: number,
): void {
  // Y-down, like the rest of the instance data.
  writeMaskData(components.mask, buffer, offset, -1);
}

function setupMaskInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
  offset: number,
): void {
  const { program } = renderable.material;
  const stride = renderable.floatsPerInstance * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceMaskClip'),
    gl,
    4,
    stride,
    (offset + CLIP_MIN_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceMaskAxes'),
    gl,
    4,
    stride,
    (offset + AXES_XX_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceMaskOrigin'),
    gl,
    2,
    stride,
    (offset + ORIGIN_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceMaskShape'),
    gl,
    4,
    stride,
    (offset + SHAPE_MODE_OFFSET) * 4,
  );
}

/**
 * The instance data segment for the masks an instance is drawn through
 * (`InstanceComponents.mask`), read by the `spriteMaskVertex` include that
 * `sprite.vert` and the glyph vertex shaders use: the clip rect of its rect
 * masks and its linear or radial mask. An unmasked instance binds an
 * unbounded clip rect and no shape. Per instance, so masked and unmasked
 * quads still batch together.
 */
export const maskInstanceDataSegment: InstanceDataSegment = {
  floatsPerInstance: MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  bindInstanceData: bindMaskInstanceData,
  setupInstanceAttributes: setupMaskInstanceAttributes,
};
