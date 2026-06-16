import type {
  BindInstanceDataCallback,
  Renderable,
  SetupInstanceAttributesCallback,
} from '../../rendering/renderable.js';
import { setupInstanceAttribute } from '../../rendering/utilities/setup-instance-attribute.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';

/**
 * Instance buffer layout for the default UI shader.
 *
 * Each UI element occupies exactly `UI_FLOATS_PER_INSTANCE` consecutive floats
 * in the instance buffer.  The layout is:
 *
 * | Offset | Name         | Floats | Shader attribute |
 * |--------|--------------|--------|-----------------|
 * |  0     | worldMat[0]  |  3     | a_worldMat0     |
 * |  3     | worldMat[1]  |  3     | a_worldMat1     |
 * |  6     | worldMat[2]  |  3     | a_worldMat2     |
 * |  9     | size         |  2     | a_size          |
 * | 11     | tint         |  4     | a_tint          |
 * | 15     | borderColor  |  4     | a_borderColor   |
 * | 19     | borderWidth  |  1     | a_borderWidth   |
 * | 20     | cornerRadius |  1     | a_cornerRadius  |
 * | 21     | opacity      |  1     | a_opacity       |
 * | 22     | clipRect     |  4     | a_clipRect      |
 * |--------|--------------|--------|-----------------|
 * | Total  |              | 26     |                 |
 */
export const UI_FLOATS_PER_INSTANCE = 26;

export const WORLD_MAT_0_OFFSET = 0;
export const WORLD_MAT_1_OFFSET = 3;
export const WORLD_MAT_2_OFFSET = 6;
export const SIZE_OFFSET = 9;
export const TINT_OFFSET = 11;
export const BORDER_COLOR_OFFSET = 15;
export const BORDER_WIDTH_OFFSET = 19;
export const CORNER_RADIUS_OFFSET = 20;
export const OPACITY_OFFSET = 21;
export const CLIP_RECT_OFFSET = 22;

/**
 * Writes one UI element's per-instance data into the instance buffer.
 */
export const bindUiInstanceData: BindInstanceDataCallback<
  UiInstanceComponents
> = (components, buffer, offset) => {
  const { transform, uiRenderable } = components;
  const m = transform.worldMatrix.matrix;

  // worldMatrix columns (col-major mat3 → 3 vec3 attributes)
  buffer[offset + WORLD_MAT_0_OFFSET] = m[0];
  buffer[offset + WORLD_MAT_0_OFFSET + 1] = m[1];
  buffer[offset + WORLD_MAT_0_OFFSET + 2] = m[2];
  buffer[offset + WORLD_MAT_1_OFFSET] = m[3];
  buffer[offset + WORLD_MAT_1_OFFSET + 1] = m[4];
  buffer[offset + WORLD_MAT_1_OFFSET + 2] = m[5];
  buffer[offset + WORLD_MAT_2_OFFSET] = m[6];
  buffer[offset + WORLD_MAT_2_OFFSET + 1] = m[7];
  buffer[offset + WORLD_MAT_2_OFFSET + 2] = m[8];

  // Element size in screen-space pixels
  buffer[offset + SIZE_OFFSET] = transform.resolvedRect.size.x;
  buffer[offset + SIZE_OFFSET + 1] = transform.resolvedRect.size.y;

  // Tint RGBA
  buffer[offset + TINT_OFFSET] = uiRenderable.tintColor.r;
  buffer[offset + TINT_OFFSET + 1] = uiRenderable.tintColor.g;
  buffer[offset + TINT_OFFSET + 2] = uiRenderable.tintColor.b;
  buffer[offset + TINT_OFFSET + 3] = uiRenderable.tintColor.a;

  // Border color RGBA
  buffer[offset + BORDER_COLOR_OFFSET] = uiRenderable.borderColor.r;
  buffer[offset + BORDER_COLOR_OFFSET + 1] = uiRenderable.borderColor.g;
  buffer[offset + BORDER_COLOR_OFFSET + 2] = uiRenderable.borderColor.b;
  buffer[offset + BORDER_COLOR_OFFSET + 3] = uiRenderable.borderColor.a;

  // Scalar style values
  buffer[offset + BORDER_WIDTH_OFFSET] = uiRenderable.borderWidth;
  buffer[offset + CORNER_RADIUS_OFFSET] = uiRenderable.cornerRadius;
  buffer[offset + OPACITY_OFFSET] = uiRenderable.opacity;

  // Clip rect (x, y, w, h); w=0 disables clipping
  const clip = transform.clipRect;

  if (clip) {
    buffer[offset + CLIP_RECT_OFFSET] = clip.origin.x;
    buffer[offset + CLIP_RECT_OFFSET + 1] = clip.origin.y;
    buffer[offset + CLIP_RECT_OFFSET + 2] = clip.size.x;
    buffer[offset + CLIP_RECT_OFFSET + 3] = clip.size.y;
  } else {
    buffer[offset + CLIP_RECT_OFFSET] = 0;
    buffer[offset + CLIP_RECT_OFFSET + 1] = 0;
    buffer[offset + CLIP_RECT_OFFSET + 2] = 0;
    buffer[offset + CLIP_RECT_OFFSET + 3] = 0;
  }
};

/**
 * Configures the per-instance vertex attribute pointers for the default UI
 * shader's instance buffer layout.
 */
export const setupUiInstanceAttributes: SetupInstanceAttributesCallback<
  UiInstanceComponents
> = (gl, renderable: Renderable<UiInstanceComponents>) => {
  const { program } = renderable.material;
  const stride = UI_FLOATS_PER_INSTANCE * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat0'),
    gl,
    3,
    stride,
    WORLD_MAT_0_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat1'),
    gl,
    3,
    stride,
    WORLD_MAT_1_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat2'),
    gl,
    3,
    stride,
    WORLD_MAT_2_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_size'),
    gl,
    2,
    stride,
    SIZE_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_tint'),
    gl,
    4,
    stride,
    TINT_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_borderColor'),
    gl,
    4,
    stride,
    BORDER_COLOR_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_borderWidth'),
    gl,
    1,
    stride,
    BORDER_WIDTH_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_cornerRadius'),
    gl,
    1,
    stride,
    CORNER_RADIUS_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_opacity'),
    gl,
    1,
    stride,
    OPACITY_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_clipRect'),
    gl,
    4,
    stride,
    CLIP_RECT_OFFSET * 4,
  );
};
