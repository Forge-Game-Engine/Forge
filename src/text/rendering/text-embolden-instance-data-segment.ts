import type {
  InstanceComponents,
  Renderable,
} from '../../rendering/renderable.js';
import type { InstanceDataSegment } from '../../rendering/utilities/instance-data-segment.js';
import { setupInstanceAttribute } from '../../rendering/utilities/setup-instance-attribute.js';

/** The number of floats occupied by a glyph's faux-bold edge shift. */
export const TEXT_EMBOLDEN_INSTANCE_DATA_FLOATS_PER_INSTANCE = 1;

function bindTextEmboldenInstanceData(
  components: InstanceComponents,
  instanceDataBufferArray: Float32Array,
  offset: number,
): void {
  const { textEmbolden } = components;

  if (textEmbolden === undefined) {
    throw new Error(
      'textEmboldenInstanceDataSegment requires InstanceComponents.textEmbolden to be set - only text glyph instances (pushTextRenderCommands) should be bound through a Renderable using this segment.',
    );
  }

  instanceDataBufferArray[offset] = textEmbolden;
}

function setupTextEmboldenInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
  offset: number,
): void {
  const { program } = renderable.material;
  const stride = renderable.floatsPerInstance * 4;

  setupInstanceAttribute(
    gl.getAttribLocation(program, 'a_instanceEmbolden'),
    gl,
    1,
    stride,
    offset * 4,
  );
}

/**
 * The instance data segment for a glyph's faux-bold edge shift
 * (`GlyphQuad.embolden`, set by a `<b>` rich text tag), read by both MSDF
 * vertex shaders (`msdf-fill.vert` and `msdf.vert`) as
 * `a_instanceEmbolden`.
 *
 * Binds `InstanceComponents.textEmbolden`, set by `pushTextRenderCommands`
 * for every glyph instance. Per instance rather than a material uniform, so
 * bold and regular glyphs of the same `FontAtlas` still batch into one draw
 * call.
 */
export const textEmboldenInstanceDataSegment: InstanceDataSegment = {
  floatsPerInstance: TEXT_EMBOLDEN_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  bindInstanceData: bindTextEmboldenInstanceData,
  setupInstanceAttributes: setupTextEmboldenInstanceAttributes,
};
