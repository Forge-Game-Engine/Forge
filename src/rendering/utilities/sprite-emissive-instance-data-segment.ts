import type { InstanceComponents, Renderable } from '../renderable.js';
import type { InstanceDataSegment } from './instance-data-segment.js';
import { setupInstanceAttribute } from './setup-instance-attribute.js';

const EMISSIVE_R_OFFSET = 0;
const EMISSIVE_G_OFFSET = 1;
const EMISSIVE_B_OFFSET = 2;

/**
 * The number of floats occupied by a sprite's emissive color.
 */
export const SPRITE_EMISSIVE_INSTANCE_DATA_FLOATS_PER_INSTANCE = 3;

function bindSpriteEmissiveInstanceData(
  components: InstanceComponents,
  instanceDataBufferArray: Float32Array,
  offset: number,
): void {
  const { emissive } = components.sprite;

  // Without an emissive map the sprite samples the black texture, so the
  // color it's multiplied by doesn't matter.
  instanceDataBufferArray[offset + EMISSIVE_R_OFFSET] = emissive?.color.r ?? 0;
  instanceDataBufferArray[offset + EMISSIVE_G_OFFSET] = emissive?.color.g ?? 0;
  instanceDataBufferArray[offset + EMISSIVE_B_OFFSET] = emissive?.color.b ?? 0;
}

function setupSpriteEmissiveInstanceAttributes(
  gl: WebGL2RenderingContext,
  renderable: Renderable,
  offset: number,
): void {
  setupInstanceAttribute(
    gl.getAttribLocation(renderable.material.program, 'a_instanceEmissive'),
    gl,
    3,
    renderable.floatsPerInstance * 4,
    (offset + EMISSIVE_R_OFFSET) * 4,
  );
}

/**
 * The instance data segment for a sprite's emissive color, read by
 * `sprite.vert` as `a_instanceEmissive`. Per instance rather than a
 * material uniform, so sprites glowing in different colors still share a
 * material and batch together.
 */
export const spriteEmissiveInstanceDataSegment: InstanceDataSegment = {
  floatsPerInstance: SPRITE_EMISSIVE_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  bindInstanceData: bindSpriteEmissiveInstanceData,
  setupInstanceAttributes: setupSpriteEmissiveInstanceAttributes,
};
