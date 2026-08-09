import {
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
  ForgeShaderSource,
  Material,
  Renderable,
  RenderContext,
  spriteInstanceDataSegment,
} from '../../rendering/index.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { msdfFragmentShader } from './shaders/index.js';

/**
 * The rendering category `createTextRenderable` assigns its `Renderable`s,
 * matched against each camera's `cullingMask` (the same bitmask-matching
 * `SpriteEcsComponent`/`Renderable` category convention used throughout
 * `/src/rendering`).
 */
const TEXT_RENDER_CATEGORY = 1;

/**
 * Builds the `Renderable` a `FontAtlas`'s glyphs are drawn with: the shared
 * sprite quad geometry and vertex shader (glyph quads are positioned,
 * pivoted, and projected exactly like a sprite region), paired with the MSDF
 * fragment shader and this atlas's texture/metrics uniforms.
 *
 * Callers should create (and cache) at most one of these per `FontAtlas` -
 * every `TextMeshEcsComponent` sharing a `Renderable` batches into a single
 * instanced draw call, exactly like sprites sharing a texture do today.
 * `createTextShapingEcsSystem` does this caching automatically.
 * @param renderContext - The render context to build the renderable with.
 * @param fontAtlas - The loaded font atlas to draw glyphs from.
 * @returns The renderable, ready to be shared by every `TextMeshEcsComponent`
 * using `fontAtlas`.
 */
export function createTextRenderable(
  renderContext: RenderContext,
  fontAtlas: FontAtlas,
): Renderable {
  const { gl, shaderCache } = renderContext;

  // `sprite.vert` is reused verbatim: glyph quads need no vertex-stage
  // behavior a sprite region doesn't already have. Registering it here is a
  // no-op if it's already in the cache (`ShaderCache.addShader` is
  // idempotent), so `/src/text` never needs `/src/rendering` to know about
  // its shader up front.
  shaderCache.addShader(new ForgeShaderSource(msdfFragmentShader));

  const vertexShader = shaderCache.getShader('sprite.vert');
  const fragmentShader = shaderCache.getShader('msdf.frag');

  const material = new Material(vertexShader, fragmentShader, gl);

  material.setUniform('u_atlas', createTextureFromImage(gl, fontAtlas.image));
  material.setUniform('u_distanceRange', fontAtlas.data.distanceRange);
  material.setUniform('u_atlasSize', fontAtlas.data.atlasSize.height);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  return new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    TEXT_RENDER_CATEGORY,
    bindInstanceData,
    setupInstanceAttributes,
  );
}
