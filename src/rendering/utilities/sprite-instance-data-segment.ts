import type { Rect } from '../../math/index.js';
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

  // Rotation. Negated to match `position.world.y` above: since positive
  // rotation is defined in the engine's Y-up world space (matching
  // Vector2.rotate/the physics system), but this Y axis is flipped before
  // reaching the shader, a rotation angle needs the same flip (equivalent
  // to negating the angle) to still visually rotate the same physical way.
  instanceDataBufferArray[offset + ROTATION_OFFSET] = -(rotation?.world ?? 0);

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

  // Tint color. Alpha additionally folds in `opacityMultiplier`, if set -
  // see its own doc comment on `SpriteEcsComponent` for why that's a
  // separate field rather than mutating `tintColor.a` itself.
  instanceDataBufferArray[offset + TINT_COLOR_R_OFFSET] = sprite.tintColor.r;
  instanceDataBufferArray[offset + TINT_COLOR_G_OFFSET] = sprite.tintColor.g;
  instanceDataBufferArray[offset + TINT_COLOR_B_OFFSET] = sprite.tintColor.b;
  instanceDataBufferArray[offset + TINT_COLOR_A_OFFSET] =
    sprite.tintColor.a * (sprite.opacityMultiplier ?? 1);
}

/**
 * Computes the world-space axis-aligned bounds of the quad `sprite.vert`
 * draws for one instance: `sprite`'s `width`/`height` around its `pivot`,
 * scaled (and flipped), rotated and placed at `position.world`, matching
 * the instance data `spriteInstanceDataSegment` binds. The render system
 * skips instances whose bounds are outside a camera's view.
 * @param components - The instance's components.
 * @param result - The rect to write the bounds into, so a caller testing
 * many instances can reuse one.
 * @returns `result`.
 */
export function computeSpriteInstanceBounds(
  components: InstanceComponents,
  result: Rect,
): Rect {
  const { position, rotation, scale, sprite, flip } = components;
  const scaleX = (scale?.world.x ?? 1) * (flip?.flipX ? -1 : 1);
  const scaleY = (scale?.world.y ?? 1) * (flip?.flipY ? -1 : 1);
  const width = sprite.width * scaleX;
  const height = sprite.height * scaleY;
  // The quad's center and half extents, relative to the pivot, before
  // rotation. A negative scale flips the quad around the pivot, which
  // moves its center but not its extents.
  const centerX = (0.5 - sprite.pivot.x) * width;
  const centerY = (0.5 - sprite.pivot.y) * height;
  const halfWidth = Math.abs(width) / 2;
  const halfHeight = Math.abs(height) / 2;
  const radians = rotation?.world ?? 0;

  if (radians === 0) {
    result.min.x = position.world.x + centerX - halfWidth;
    result.min.y = position.world.y + centerY - halfHeight;
    result.max.x = position.world.x + centerX + halfWidth;
    result.max.y = position.world.y + centerY + halfHeight;

    return result;
  }

  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatedCenterX = position.world.x + centerX * cos - centerY * sin;
  const rotatedCenterY = position.world.y + centerX * sin + centerY * cos;
  const extentX = halfWidth * Math.abs(cos) + halfHeight * Math.abs(sin);
  const extentY = halfWidth * Math.abs(sin) + halfHeight * Math.abs(cos);

  result.min.x = rotatedCenterX - extentX;
  result.min.y = rotatedCenterY - extentY;
  result.max.x = rotatedCenterX + extentX;
  result.max.y = rotatedCenterY + extentY;

  return result;
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

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceTint'),
    gl,
    4,
    stride,
    (offset + TINT_COLOR_R_OFFSET) * 4,
  );
}

/**
 * The instance data segment for the standard sprite vertex shader (`sprite.vert`).
 *
 * Binds position, rotation, scale, size, pivot, texture coordinates and tint
 * from an entity's `SpriteEcsComponent`, and wires them up to the
 * `a_instancePos`, `a_instanceRot`, `a_instanceScale`, `a_instanceSize`,
 * `a_instancePivot`, `a_instanceTexOffset`, `a_instanceTexSize` and
 * `a_instanceTint` attributes.
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
