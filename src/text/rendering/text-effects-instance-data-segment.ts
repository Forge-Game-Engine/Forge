import type {
  InstanceComponents,
  InstanceDataSegment,
  Renderable,
} from '../../rendering/index.js';
import { setupInstanceAttribute } from '../../rendering/index.js';

const OUTLINE_COLOR_R_OFFSET = 0;
const OUTLINE_COLOR_G_OFFSET = 1;
const OUTLINE_COLOR_B_OFFSET = 2;
const OUTLINE_COLOR_A_OFFSET = 3;
const OUTLINE_WIDTH_OFFSET = 4;
const SHADOW_COLOR_R_OFFSET = 5;
const SHADOW_COLOR_G_OFFSET = 6;
const SHADOW_COLOR_B_OFFSET = 7;
const SHADOW_COLOR_A_OFFSET = 8;
const SHADOW_OFFSET_X_OFFSET = 9;
const SHADOW_OFFSET_Y_OFFSET = 10;
const SHADOW_SOFTNESS_OFFSET = 11;

/**
 * The number of floats occupied by a glyph's text effect instance data
 * (outline color/width, shadow color/offset/softness).
 */
export const TEXT_EFFECTS_INSTANCE_DATA_FLOATS_PER_INSTANCE = 12;

function bindTextEffectsInstanceData(
  components: InstanceComponents,
  instanceDataBufferArray: Float32Array,
  offset: number,
): void {
  const { textEffects } = components;

  if (!textEffects) {
    throw new Error(
      'textEffectsInstanceDataSegment requires InstanceComponents.textEffects to be set - only text glyph instances (pushTextRenderCommands) should be bound through a Renderable using this segment.',
    );
  }

  const {
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowOffset,
    shadowSoftness,
  } = textEffects;

  instanceDataBufferArray[offset + OUTLINE_COLOR_R_OFFSET] = outlineColor.r;
  instanceDataBufferArray[offset + OUTLINE_COLOR_G_OFFSET] = outlineColor.g;
  instanceDataBufferArray[offset + OUTLINE_COLOR_B_OFFSET] = outlineColor.b;
  instanceDataBufferArray[offset + OUTLINE_COLOR_A_OFFSET] = outlineColor.a;
  instanceDataBufferArray[offset + OUTLINE_WIDTH_OFFSET] = outlineWidth;

  instanceDataBufferArray[offset + SHADOW_COLOR_R_OFFSET] = shadowColor.r;
  instanceDataBufferArray[offset + SHADOW_COLOR_G_OFFSET] = shadowColor.g;
  instanceDataBufferArray[offset + SHADOW_COLOR_B_OFFSET] = shadowColor.b;
  instanceDataBufferArray[offset + SHADOW_COLOR_A_OFFSET] = shadowColor.a;
  instanceDataBufferArray[offset + SHADOW_OFFSET_X_OFFSET] = shadowOffset.x;
  instanceDataBufferArray[offset + SHADOW_OFFSET_Y_OFFSET] = shadowOffset.y;
  instanceDataBufferArray[offset + SHADOW_SOFTNESS_OFFSET] = shadowSoftness;
}

function setupTextEffectsInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
  offset: number,
): void {
  const { program } = renderable.material;
  const stride = renderable.floatsPerInstance * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceOutlineColor'),
    gl,
    4,
    stride,
    (offset + OUTLINE_COLOR_R_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceOutlineWidth'),
    gl,
    1,
    stride,
    (offset + OUTLINE_WIDTH_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceShadowColor'),
    gl,
    4,
    stride,
    (offset + SHADOW_COLOR_R_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceShadowOffset'),
    gl,
    2,
    stride,
    (offset + SHADOW_OFFSET_X_OFFSET) * 4,
  );

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceShadowSoftness'),
    gl,
    1,
    stride,
    (offset + SHADOW_SOFTNESS_OFFSET) * 4,
  );
}

/**
 * The instance data segment for the MSDF text vertex shader's (`msdf.vert`)
 * outline/shadow parameters.
 *
 * Binds `InstanceComponents.textEffects` (set by `pushTextRenderCommands`
 * for every glyph instance) and wires it up to the `a_instanceOutlineColor`,
 * `a_instanceOutlineWidth`, `a_instanceShadowColor`, `a_instanceShadowOffset`
 * and `a_instanceShadowSoftness` attributes.
 *
 * Combine this with `spriteInstanceDataSegment` via
 * `combineInstanceDataSegments` to build the MSDF text `Renderable`'s
 * instance data layout (see `createTextRenderable`) - per-instance, rather
 * than a material uniform, so that text entities sharing the same
 * `FontAtlas` but different outline/shadow settings still batch into a
 * single draw call.
 */
export const textEffectsInstanceDataSegment: InstanceDataSegment = {
  floatsPerInstance: TEXT_EFFECTS_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  bindInstanceData: bindTextEffectsInstanceData,
  setupInstanceAttributes: setupTextEffectsInstanceAttributes,
};
