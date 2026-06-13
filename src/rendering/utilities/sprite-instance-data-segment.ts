import type { InstanceComponents, Renderable } from '../renderable.js';
import type { InstanceDataSegment } from './instance-data-segment.js';
import { setupInstanceAttribute } from './setup-instance-attribute.js';

const POSITION_X_OFFSET = 0;
const POSITION_Y_OFFSET = 1;
const ROTATION_OFFSET = 2;
const SCALE_X_OFFSET = 3;
const SCALE_Y_OFFSET = 4;
const WIDTH_OFFSET = 5;
const HEIGHT_OFFSET = 6;
const PIVOT_X_OFFSET = 7;
const PIVOT_Y_OFFSET = 8;
const TEX_OFFSET_X_OFFSET = 9;
const TEX_OFFSET_Y_OFFSET = 10;
const TEX_SIZE_X_OFFSET = 11;
const TEX_SIZE_Y_OFFSET = 12;
const TINT_COLOR_R_OFFSET = 13;
const TINT_COLOR_G_OFFSET = 14;
const TINT_COLOR_B_OFFSET = 15;
const TINT_COLOR_A_OFFSET = 16;

/**
 * The number of floats occupied by the standard sprite instance data
 * (position, rotation, scale, size, pivot, texture coordinates and tint).
 */
export const SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE = 17;

function bindSpriteInstanceData(
  components: InstanceComponents,
  instanceDataBufferArray: Float32Array,
  offset: number,
): void {
  const { position, rotation, scale, sprite, flip } = components;

  // Position
  instanceDataBufferArray[offset + POSITION_X_OFFSET] = position.world.x;
  instanceDataBufferArray[offset + POSITION_Y_OFFSET] = -position.world.y;

  // Rotation
  instanceDataBufferArray[offset + ROTATION_OFFSET] = rotation?.world ?? 0;

  // Scale with flip consideration
  instanceDataBufferArray[offset + SCALE_X_OFFSET] =
    (scale?.world.x ?? 1) * (flip?.flipX ? -1 : 1);
  instanceDataBufferArray[offset + SCALE_Y_OFFSET] =
    (scale?.world.y ?? 1) * (flip?.flipY ? -1 : 1);

  // Sprite dimensions
  instanceDataBufferArray[offset + WIDTH_OFFSET] = sprite.width;
  instanceDataBufferArray[offset + HEIGHT_OFFSET] = sprite.height;

  // Sprite pivot
  instanceDataBufferArray[offset + PIVOT_X_OFFSET] = sprite.pivot.x;
  instanceDataBufferArray[offset + PIVOT_Y_OFFSET] = sprite.pivot.y;

  // Texture coordinates (animation frame or defaults)
  instanceDataBufferArray[offset + TEX_OFFSET_X_OFFSET] = sprite.uvOffset.x;
  instanceDataBufferArray[offset + TEX_OFFSET_Y_OFFSET] = sprite.uvOffset.y;
  instanceDataBufferArray[offset + TEX_SIZE_X_OFFSET] = sprite.uvScale.x;
  instanceDataBufferArray[offset + TEX_SIZE_Y_OFFSET] = sprite.uvScale.y;

  // Tint color
  instanceDataBufferArray[offset + TINT_COLOR_R_OFFSET] = sprite.tintColor.r;
  instanceDataBufferArray[offset + TINT_COLOR_G_OFFSET] = sprite.tintColor.g;
  instanceDataBufferArray[offset + TINT_COLOR_B_OFFSET] = sprite.tintColor.b;
  instanceDataBufferArray[offset + TINT_COLOR_A_OFFSET] = sprite.tintColor.a;
}

function setupSpriteInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
  offset: number,
): void {
  const { program } = renderable.material;
  const stride = renderable.floatsPerInstance * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instancePos'),
    gl,
    2,
    stride,
    (offset + POSITION_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceRot'),
    gl,
    1,
    stride,
    (offset + ROTATION_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceScale'),
    gl,
    2,
    stride,
    (offset + SCALE_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceSize'),
    gl,
    2,
    stride,
    (offset + WIDTH_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instancePivot'),
    gl,
    2,
    stride,
    (offset + PIVOT_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceTexOffset'),
    gl,
    2,
    stride,
    (offset + TEX_OFFSET_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceTexSize'),
    gl,
    2,
    stride,
    (offset + TEX_SIZE_X_OFFSET) * 4,
  );
}

/**
 * The instance data segment for the standard sprite vertex shader (`sprite.vert`).
 *
 * Binds position, rotation, scale, size, pivot, texture coordinates and tint
 * from an entity's `SpriteEcsComponent`, and wires them up to the
 * `a_instancePos`, `a_instanceRot`, `a_instanceScale`, `a_instanceSize`,
 * `a_instancePivot`, `a_instanceTexOffset` and `a_instanceTexSize` attributes.
 *
 * Use this with `combineInstanceDataSegments` to reuse the sprite vertex
 * shader with a custom fragment shader, or to extend it with additional
 * per-instance attributes.
 */
export const spriteInstanceDataSegment: InstanceDataSegment = {
  floatsPerInstance: SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  bindInstanceData: bindSpriteInstanceData,
  setupInstanceAttributes: setupSpriteInstanceAttributes,
};
