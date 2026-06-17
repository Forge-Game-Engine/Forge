import type { Matrix3x3, Rect } from '../../math/index.js';
import type {
  BindInstanceDataCallback,
  Renderable,
  SetupInstanceAttributesCallback,
} from '../../rendering/renderable.js';
import { setupInstanceAttribute } from '../../rendering/utilities/setup-instance-attribute.js';

/**
 * Per-glyph instance data passed to {@link bindTextGlyphInstanceData}.
 *
 * Coordinates are normalised fractions of the element's `resolvedRect` so the
 * text vertex shader can apply the same world-matrix transform used by all
 * other UI elements.
 */
export interface TextGlyphInstanceComponents {
  /** The element's world matrix (maps [0,1]x[0,1] to screen pixels). */
  worldMatrix: Matrix3x3;

  /** Glyph left edge as a fraction of the element width. */
  glyphOffsetNormX: number;

  /** Glyph top edge as a fraction of the element height. */
  glyphOffsetNormY: number;

  /** Glyph display width as a fraction of the element width. */
  glyphSizeNormX: number;

  /** Glyph display height as a fraction of the element height. */
  glyphSizeNormY: number;

  /** Atlas UV minimum X (normalised 0–1). */
  uvMinX: number;

  /** Atlas UV minimum Y (normalised 0–1). */
  uvMinY: number;

  /** Atlas UV width (normalised 0–1). */
  uvSizeX: number;

  /** Atlas UV height (normalised 0–1). */
  uvSizeY: number;

  /** Text colour red component (0–1). */
  colorR: number;

  /** Text colour green component (0–1). */
  colorG: number;

  /** Text colour blue component (0–1). */
  colorB: number;

  /** Text colour alpha component (0–1). */
  colorA: number;

  /**
   * Inherited clip rect in screen-space pixels (x, y, w, h).
   * `null` means no clipping.
   */
  clipRect: Rect | null | undefined;

  /** Opacity multiplier (0–1). */
  opacity: number;
}

/**
 * Instance buffer layout for the text SDF shader.
 *
 * Each glyph occupies exactly `TEXT_FLOATS_PER_INSTANCE` consecutive floats.
 *
 * | Offset | Name        | Floats | Attribute      |
 * |--------|-------------|--------|----------------|
 * |  0     | worldMat0   |  3     | a_worldMat0    |
 * |  3     | worldMat1   |  3     | a_worldMat1    |
 * |  6     | worldMat2   |  3     | a_worldMat2    |
 * |  9     | glyphOffset |  2     | a_glyphOffset  |
 * | 11     | glyphSize   |  2     | a_glyphSize    |
 * | 13     | uvMin       |  2     | a_uvMin        |
 * | 15     | uvSize      |  2     | a_uvSize       |
 * | 17     | color       |  4     | a_color        |
 * | 21     | clipRect    |  4     | a_clipRect     |
 * | 25     | opacity     |  1     | a_opacity      |
 * | Total  |             | 26     |                |
 */
export const TEXT_FLOATS_PER_INSTANCE = 26;

export const TEXT_WORLD_MAT_0_OFFSET = 0;
export const TEXT_WORLD_MAT_1_OFFSET = 3;
export const TEXT_WORLD_MAT_2_OFFSET = 6;
export const TEXT_GLYPH_OFFSET_OFFSET = 9;
export const TEXT_GLYPH_SIZE_OFFSET = 11;
export const TEXT_UV_MIN_OFFSET = 13;
export const TEXT_UV_SIZE_OFFSET = 15;
export const TEXT_COLOR_OFFSET = 17;
export const TEXT_CLIP_RECT_OFFSET = 21;
export const TEXT_OPACITY_OFFSET = 25;

/**
 * Writes one glyph's per-instance data into the instance buffer.
 */
export const bindTextGlyphInstanceData: BindInstanceDataCallback<
  TextGlyphInstanceComponents
> = (components, buffer, offset) => {
  const m = components.worldMatrix.matrix;

  buffer[offset + TEXT_WORLD_MAT_0_OFFSET] = m[0];
  buffer[offset + TEXT_WORLD_MAT_0_OFFSET + 1] = m[1];
  buffer[offset + TEXT_WORLD_MAT_0_OFFSET + 2] = m[2];
  buffer[offset + TEXT_WORLD_MAT_1_OFFSET] = m[3];
  buffer[offset + TEXT_WORLD_MAT_1_OFFSET + 1] = m[4];
  buffer[offset + TEXT_WORLD_MAT_1_OFFSET + 2] = m[5];
  buffer[offset + TEXT_WORLD_MAT_2_OFFSET] = m[6];
  buffer[offset + TEXT_WORLD_MAT_2_OFFSET + 1] = m[7];
  buffer[offset + TEXT_WORLD_MAT_2_OFFSET + 2] = m[8];

  buffer[offset + TEXT_GLYPH_OFFSET_OFFSET] = components.glyphOffsetNormX;
  buffer[offset + TEXT_GLYPH_OFFSET_OFFSET + 1] = components.glyphOffsetNormY;

  buffer[offset + TEXT_GLYPH_SIZE_OFFSET] = components.glyphSizeNormX;
  buffer[offset + TEXT_GLYPH_SIZE_OFFSET + 1] = components.glyphSizeNormY;

  buffer[offset + TEXT_UV_MIN_OFFSET] = components.uvMinX;
  buffer[offset + TEXT_UV_MIN_OFFSET + 1] = components.uvMinY;

  buffer[offset + TEXT_UV_SIZE_OFFSET] = components.uvSizeX;
  buffer[offset + TEXT_UV_SIZE_OFFSET + 1] = components.uvSizeY;

  buffer[offset + TEXT_COLOR_OFFSET] = components.colorR;
  buffer[offset + TEXT_COLOR_OFFSET + 1] = components.colorG;
  buffer[offset + TEXT_COLOR_OFFSET + 2] = components.colorB;
  buffer[offset + TEXT_COLOR_OFFSET + 3] = components.colorA;

  const clip = components.clipRect;

  if (clip) {
    buffer[offset + TEXT_CLIP_RECT_OFFSET] = clip.origin.x;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 1] = clip.origin.y;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 2] = clip.size.x;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 3] = clip.size.y;
  } else {
    buffer[offset + TEXT_CLIP_RECT_OFFSET] = 0;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 1] = 0;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 2] = 0;
    buffer[offset + TEXT_CLIP_RECT_OFFSET + 3] = 0;
  }

  buffer[offset + TEXT_OPACITY_OFFSET] = components.opacity;
};

/**
 * Configures per-instance vertex attribute pointers for the text SDF shader.
 */
export const setupTextInstanceAttributes: SetupInstanceAttributesCallback<
  TextGlyphInstanceComponents
> = (gl, renderable: Renderable<TextGlyphInstanceComponents>) => {
  const { program } = renderable.material;
  const stride = TEXT_FLOATS_PER_INSTANCE * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat0'),
    gl,
    3,
    stride,
    TEXT_WORLD_MAT_0_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat1'),
    gl,
    3,
    stride,
    TEXT_WORLD_MAT_1_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_worldMat2'),
    gl,
    3,
    stride,
    TEXT_WORLD_MAT_2_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_glyphOffset'),
    gl,
    2,
    stride,
    TEXT_GLYPH_OFFSET_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_glyphSize'),
    gl,
    2,
    stride,
    TEXT_GLYPH_SIZE_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_uvMin'),
    gl,
    2,
    stride,
    TEXT_UV_MIN_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_uvSize'),
    gl,
    2,
    stride,
    TEXT_UV_SIZE_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_color'),
    gl,
    4,
    stride,
    TEXT_COLOR_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_clipRect'),
    gl,
    4,
    stride,
    TEXT_CLIP_RECT_OFFSET * 4,
  );
  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_opacity'),
    gl,
    1,
    stride,
    TEXT_OPACITY_OFFSET * 4,
  );
};
