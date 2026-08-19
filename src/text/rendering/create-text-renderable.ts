import {
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
  Material,
  Renderable,
  RenderContext,
  spriteInstanceDataSegment,
} from '../../rendering/index.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { textEffectsInstanceDataSegment } from './text-effects-instance-data-segment.js';

/**
 * The default rendering category a text entity's glyphs are drawn with when
 * `TextEcsComponent.category` isn't overridden, matched against each
 * camera's `cullingMask` (the same bitmask-matching `SpriteEcsComponent`/
 * `Renderable` category convention used throughout `/src/rendering`). Not
 * reserved or forced - it's a default like any other, and `TextEcsComponent.category`
 * overrides it per entity when a game needs its text under a different mask
 * than whatever else already uses this category.
 */
export const TEXT_RENDER_CATEGORY = 1;

/**
 * The pair of `Renderable`s a `FontAtlas`'s glyphs draw with - see
 * `createTextRenderable`'s doc comment for why glyph rendering is split
 * into two ordered draw passes instead of one.
 */
export interface TextRenderables {
  /**
   * Draws only a glyph's own anti-aliased ink (`msdf-fill.frag`), using the
   * plain sprite vertex layout - no outline/shadow instance data. Always
   * drawn *after* `effectsRenderable` for the same glyphs (see
   * `pushTextRenderCommands` in `glyph-quad.ts`), so a glyph's fill can
   * never be painted over by a neighboring glyph's outline/shadow.
   */
  fillRenderable: Renderable;

  /**
   * Draws only a glyph's outline ring and soft shadow/glow
   * (`msdf-effects.frag`), with no fill layer. Only pushed for glyphs that
   * actually have an outline/shadow configured (see
   * `pushTextRenderCommands`).
   */
  effectsRenderable: Renderable;
}

/**
 * Builds the pair of `Renderable`s a `FontAtlas`'s glyphs are drawn with:
 * the shared sprite quad geometry, paired with the MSDF fill/effects
 * fragment shaders and this atlas's texture/metrics uniforms.
 *
 * Glyph rendering is split into two ordered passes - fill and
 * outline/shadow ("effects") - rather than the single combined draw a
 * `SpriteEcsComponent` uses, so that an outline/shadow can safely reach
 * past a same-word neighboring glyph (even merge with that neighbor's own
 * outline) without ever painting over that neighbor's own fill: every
 * glyph's effects in a text entity are pushed before every glyph's fill
 * (see `pushTextRenderCommands`), and `effectsRenderable`'s draw call
 * always completes before `fillRenderable`'s, so fill always ends up on
 * top regardless of how far an effect reaches. See
 * `documentation-site/docs/docs/text/text-effects.md` for the full
 * rationale and the atlas-encoding budget that still bounds how far an
 * outline can reach.
 *
 * Callers should create (and cache) at most one pair of these per
 * `(FontAtlas, category)` pair - every `TextMeshEcsComponent` sharing a
 * `Renderable` batches into a single instanced draw call, exactly like
 * sprites sharing a texture do today. `createTextShapingEcsSystem` does this
 * caching automatically.
 * @param renderContext - The render context to build the renderables with.
 * @param fontAtlas - The loaded font atlas to draw glyphs from.
 * @param category - The render category to assign both renderables (see
 * `TEXT_RENDER_CATEGORY`).
 * @returns The renderables, ready to be shared by every `TextMeshEcsComponent`
 * using `fontAtlas` with this `category`.
 */
export function createTextRenderable(
  renderContext: RenderContext,
  fontAtlas: FontAtlas,
  category: number,
): TextRenderables {
  const { gl, shaderCache } = renderContext;

  // Created once and shared by both materials below - each is its own GPU
  // texture object, so binding the same atlas image twice would otherwise
  // double the texture memory this font atlas uses for no benefit.
  const atlasTexture = createTextureFromImage(gl, fontAtlas.image);

  const fillMaterial = new Material(
    shaderCache.getShader('sprite.vert'),
    shaderCache.getShader('msdf-fill.frag'),
    gl,
  );

  fillMaterial.setUniform('u_atlas', atlasTexture);
  fillMaterial.setUniform('u_distanceRange', fontAtlas.data.distanceRange);
  fillMaterial.setUniform('u_atlasSize', fontAtlas.data.atlasSize.height);

  const {
    floatsPerInstance: fillFloatsPerInstance,
    bindInstanceData: fillBindInstanceData,
    setupInstanceAttributes: fillSetupInstanceAttributes,
  } = combineInstanceDataSegments(spriteInstanceDataSegment);

  const fillRenderable = new Renderable(
    createQuadGeometry(gl),
    fillMaterial,
    fillFloatsPerInstance,
    category,
    fillBindInstanceData,
    fillSetupInstanceAttributes,
  );

  // `msdf.vert` extends `sprite.vert`'s positioning/pivot/rotation/
  // projection math verbatim, adding only the per-instance forwarding
  // outline/shadow effects need (see `msdf.vert.glsl`).
  const effectsMaterial = new Material(
    shaderCache.getShader('msdf.vert'),
    shaderCache.getShader('msdf-effects.frag'),
    gl,
  );

  effectsMaterial.setUniform('u_atlas', atlasTexture);
  effectsMaterial.setUniform('u_distanceRange', fontAtlas.data.distanceRange);
  effectsMaterial.setUniform('u_atlasSize', fontAtlas.data.atlasSize.height);

  const {
    floatsPerInstance: effectsFloatsPerInstance,
    bindInstanceData: effectsBindInstanceData,
    setupInstanceAttributes: effectsSetupInstanceAttributes,
  } = combineInstanceDataSegments(
    spriteInstanceDataSegment,
    textEffectsInstanceDataSegment,
  );

  const effectsRenderable = new Renderable(
    createQuadGeometry(gl),
    effectsMaterial,
    effectsFloatsPerInstance,
    category,
    effectsBindInstanceData,
    effectsSetupInstanceAttributes,
  );

  return { fillRenderable, effectsRenderable };
}
