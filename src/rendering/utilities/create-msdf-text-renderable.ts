import { FontAtlas } from '../../asset-loading/index.js';
import { createQuadGeometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { Renderable } from '../renderable.js';
import { createTextureFromImage } from '../shaders/index.js';
import { combineInstanceDataSegments } from './instance-data-segment.js';
import { spriteInstanceDataSegment } from './sprite-instance-data-segment.js';

/**
 * Creates the `Renderable` used to draw text set in a given `FontAtlas`.
 *
 * Reuses the sprite vertex shader (`sprite.vert`) and its instance data
 * layout unchanged - a glyph quad's position/rotation/scale/size/pivot/uv/
 * tint are exactly the data a sprite instance already carries - paired with
 * an MSDF fragment shader that reconstructs a signed distance field from the
 * atlas texture's three channels and antialiases the glyph edge against the
 * texture coordinate's screen-space derivative, so text stays crisp at any
 * scale. Share one `Renderable` (call this once per `FontAtlas`, not per
 * `TextEcsComponent`) so every entity drawing with the same font batches
 * into a single instanced draw call.
 * @param fontAtlas - The font atlas to draw text from.
 * @param renderContext - The render context to build GPU resources with.
 * @param layer - The rendering category, matched against each camera's
 * culling mask. Defaults to `0`.
 * @param pixelated - Samples the atlas texture with nearest-neighbor
 * filtering instead of linear. An MSDF atlas is reconstructed by the
 * fragment shader's own antialiasing rather than by texture filtering, so
 * this should almost always stay `false` (the default).
 * @returns The created renderable.
 */
export function createMsdfTextRenderable(
  fontAtlas: FontAtlas,
  renderContext: RenderContext,
  layer: number = 0,
  pixelated: boolean = false,
): Renderable {
  const { shaderCache, gl } = renderContext;

  const vertexShader = shaderCache.getShader('sprite.vert');
  const fragmentShader = shaderCache.getShader('msdf.frag');

  const material = new Material(vertexShader, fragmentShader, gl);

  material.setUniform(
    'u_texture',
    createTextureFromImage(gl, fontAtlas.image, pixelated),
  );
  material.setUniform('u_distanceRange', fontAtlas.distanceRange);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  return new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );
}
