import {
  combineInstanceDataSegments,
  createQuadGeometry,
  ForgeShaderSource,
  InstanceDataSegment,
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
 * Creates a material for drawing text's fill with a fragment shader of your
 * own, for `TextEcsComponent.material`. It's drawn with the engine's
 * `sprite.vert`, so the shader receives `v_texCoord` (the glyph's
 * coordinates in its font's atlas) and `v_tint` (the text's color, with
 * `opacityMultiplier` applied to its alpha), and outputs straight alpha.
 *
 * The shader gets its font from `#pragma forge include(msdf)`, which
 * declares the atlas uniforms and `msdfCoverage(texCoord)`: how much of the
 * pixel at `texCoord` the glyph's ink covers. The text renderer binds those
 * uniforms for each font the material draws, so one material works for
 * every font. Set the shader's own uniforms on the returned material; they
 * apply to every text drawn with it.
 * @param renderContext - The render context the material draws with.
 * @param fragmentShader - The fragment shader. Added to the render context's
 * shader cache (if a shader with its name isn't already there), so its
 * includes are resolved.
 * @returns The material.
 * @example
 * ```ts
 * const gradient = createTextMaterial(
 *   renderContext,
 *   new ForgeShaderSource(`#version 300 es
 * #pragma forge name(gradient-text.frag)
 * precision mediump float;
 * #pragma forge include(msdf)
 * uniform vec4 u_bottomColor;
 * in vec2 v_texCoord;
 * in vec4 v_tint;
 * out vec4 fragColor;
 * void main() {
 *   float t = gl_FragCoord.y / 600.0;
 *   vec4 color = mix(u_bottomColor, v_tint, t);
 *   fragColor = vec4(color.rgb, color.a * msdfCoverage(v_texCoord));
 * }`),
 * );
 * ```
 */
export function createTextMaterial(
  renderContext: RenderContext,
  fragmentShader: ForgeShaderSource,
): Material {
  const { gl, shaderCache } = renderContext;

  shaderCache.addShader(fragmentShader);

  return new Material(
    shaderCache.getShader('sprite.vert'),
    shaderCache.getShader(fragmentShader.name),
    gl,
  );
}

/**
 * The pair of `Renderable`s glyphs of one font are drawn with - see
 * `createTextRenderables`'s doc comment for why glyph rendering is split
 * into two ordered draw passes instead of one.
 */
export interface TextRenderables {
  /**
   * Draws only a glyph's own ink, with the text's fill material, using the
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
 * The materials and font a {@link TextRenderables} pair draws with.
 */
export interface TextRenderablesOptions {
  /** The font whose glyphs are drawn. */
  fontAtlas: FontAtlas;

  /**
   * `fontAtlas.image`, already uploaded. Shared by every renderable of the
   * font, so it's uploaded once however many materials and categories
   * draw the font.
   */
  atlasTexture: WebGLTexture;

  /**
   * The fill material: the built-in `msdf-fill.frag` one, or one from
   * `createTextMaterial`.
   */
  fillMaterial: Material;

  /** The outline/shadow material, made from `msdf.vert` and `msdf-effects.frag`. */
  effectsMaterial: Material;

  /** The render category both renderables are drawn under. */
  category: number;
}

const createGlyphRenderable = (
  renderContext: RenderContext,
  material: Material,
  { fontAtlas, atlasTexture, category }: TextRenderablesOptions,
  instanceDataSegments: InstanceDataSegment[],
): Renderable => {
  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(...instanceDataSegments);

  const renderable = new Renderable(
    createQuadGeometry(renderContext.gl),
    material,
    floatsPerInstance,
    category,
    bindInstanceData,
    setupInstanceAttributes,
  );

  // Bound per renderable rather than set on the shared material, so one
  // material draws every font.
  renderable.setUniform('u_atlas', atlasTexture);
  renderable.setUniform('u_distanceRange', fontAtlas.data.distanceRange);
  renderable.setUniform('u_atlasSize', fontAtlas.data.atlasSize.height);

  return renderable;
};

/**
 * Builds the pair of `Renderable`s a font's glyphs are drawn with: the
 * shared sprite quad geometry with the fill and effects materials, each
 * binding this font's atlas.
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
 * `(FontAtlas, fill material, category)` - every `TextMeshEcsComponent`
 * sharing a `Renderable` batches into a single instanced draw call, exactly
 * like sprites sharing a texture do. `createTextShapingEcsSystem` does this
 * caching automatically.
 * @param renderContext - The render context to build the renderables with.
 * @param options - The font, its uploaded atlas, the two materials and the
 * render category.
 * @returns The renderables.
 */
export function createTextRenderables(
  renderContext: RenderContext,
  options: TextRenderablesOptions,
): TextRenderables {
  return {
    fillRenderable: createGlyphRenderable(
      renderContext,
      options.fillMaterial,
      options,
      [spriteInstanceDataSegment],
    ),
    // `msdf.vert` extends `sprite.vert`'s positioning/pivot/rotation/
    // projection math verbatim, adding only the per-instance forwarding
    // outline/shadow effects need (see `msdf.vert.glsl`).
    effectsRenderable: createGlyphRenderable(
      renderContext,
      options.effectsMaterial,
      options,
      [spriteInstanceDataSegment, textEffectsInstanceDataSegment],
    ),
  };
}
