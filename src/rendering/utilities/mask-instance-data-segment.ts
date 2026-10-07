import type { InstanceComponents, Renderable } from '../renderable.js';
import type { InstanceDataSegment } from './instance-data-segment.js';
import type { InstanceShapeMask } from './resolve-instance-mask.js';
import { setupInstanceAttribute } from './setup-instance-attribute.js';

const CLIP_MIN_X_OFFSET = 0;
const CLIP_MIN_Y_OFFSET = 1;
const CLIP_MAX_X_OFFSET = 2;
const CLIP_MAX_Y_OFFSET = 3;
const AXES_XX_OFFSET = 4;
const AXES_XY_OFFSET = 5;
const AXES_YX_OFFSET = 6;
const AXES_YY_OFFSET = 7;
const ORIGIN_X_OFFSET = 8;
const ORIGIN_Y_OFFSET = 9;
const SHAPE_MODE_OFFSET = 10;
const SHAPE_PARAMETER_0_OFFSET = 11;
const SHAPE_PARAMETER_1_OFFSET = 12;
const SHAPE_PARAMETER_2_OFFSET = 13;

/** The shape modes `spriteMaskCoverage` switches on. */
const SHAPE_MODE_NONE = 0;
const SHAPE_MODE_LINEAR = 1;
const SHAPE_MODE_RADIAL = 2;

/**
 * Stands in for an unbounded clip rect edge. Finite, so the shader's
 * distance arithmetic stays finite, and far beyond any world coordinate.
 */
const UNCLIPPED = 1e30;

/** The number of floats occupied by an instance's mask data. */
export const MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE = 14;

const toShaderCoordinate = (value: number): number =>
  Math.min(Math.max(value, -UNCLIPPED), UNCLIPPED);

function bindShapeMask(
  shape: InstanceShapeMask,
  buffer: Float32Array,
  offset: number,
): void {
  const { origin, axes } = shape;

  // The shader works in a Y-down world (see `bindSpriteInstanceData`), so
  // the Y input of the axes and the origin's Y are negated.
  buffer[offset + AXES_XX_OFFSET] = axes.xx;
  buffer[offset + AXES_XY_OFFSET] = -axes.xy;
  buffer[offset + AXES_YX_OFFSET] = axes.yx;
  buffer[offset + AXES_YY_OFFSET] = -axes.yy;
  buffer[offset + ORIGIN_X_OFFSET] = origin.x;
  buffer[offset + ORIGIN_Y_OFFSET] = -origin.y;

  if (shape.kind === 'linear') {
    buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_LINEAR;
    buffer[offset + SHAPE_PARAMETER_0_OFFSET] = shape.edge;
    buffer[offset + SHAPE_PARAMETER_1_OFFSET] = 0;
    buffer[offset + SHAPE_PARAMETER_2_OFFSET] = 0;

    return;
  }

  buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_RADIAL;
  buffer[offset + SHAPE_PARAMETER_0_OFFSET] = shape.startAngle;
  buffer[offset + SHAPE_PARAMETER_1_OFFSET] = shape.filledSweep;
  buffer[offset + SHAPE_PARAMETER_2_OFFSET] = shape.aspect;
}

function bindMaskInstanceData(
  components: InstanceComponents,
  buffer: Float32Array,
  offset: number,
): void {
  const { mask } = components;
  const clip = mask?.clip;

  // Y-down, like the rest of the instance data: the clip rect's top edge
  // becomes its minimum.
  buffer[offset + CLIP_MIN_X_OFFSET] = toShaderCoordinate(
    clip?.min.x ?? -Infinity,
  );
  buffer[offset + CLIP_MIN_Y_OFFSET] = toShaderCoordinate(
    -(clip?.max.y ?? Infinity),
  );
  buffer[offset + CLIP_MAX_X_OFFSET] = toShaderCoordinate(
    clip?.max.x ?? Infinity,
  );
  buffer[offset + CLIP_MAX_Y_OFFSET] = toShaderCoordinate(
    -(clip?.min.y ?? -Infinity),
  );

  if (mask?.shape) {
    bindShapeMask(mask.shape, buffer, offset);

    return;
  }

  buffer.fill(0, offset + AXES_XX_OFFSET, offset + SHAPE_MODE_OFFSET);
  buffer[offset + SHAPE_MODE_OFFSET] = SHAPE_MODE_NONE;
  buffer.fill(
    0,
    offset + SHAPE_PARAMETER_0_OFFSET,
    offset + MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  );
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
