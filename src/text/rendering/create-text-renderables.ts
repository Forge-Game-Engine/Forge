import { Material } from '../../rendering/materials/material.js';
import type { RenderCommand } from '../../rendering/render-command.js';
import type { RenderContext } from '../../rendering/render-context.js';
import { Renderable } from '../../rendering/renderable.js';
import { combineInstanceDataSegments } from '../../rendering/utilities/instance-data-segment.js';
import { spriteInstanceDataSegment } from '../../rendering/utilities/sprite-instance-data-segment.js';
import { textEffectsInstanceDataSegment } from './text-effects-instance-data-segment.js';
import { textEmboldenInstanceDataSegment } from './text-embolden-instance-data-segment.js';

/**
 * The pair of `Renderable`s glyphs draw with - see `createTextRenderables`'
 * doc comment for why glyph rendering is split into two ordered draw passes
 * instead of one.
 */
export interface TextRenderables {
  /**
   * Draws only a glyph's own anti-aliased ink (`msdf-fill.frag`), using the
   * sprite vertex layout plus the glyph's faux-bold embolden - no
   * outline/shadow instance data. Always drawn *after* `effectsRenderable`
   * for the same glyphs (see `pushTextRenderCommands` in `glyph-quad.ts`),
   * so a glyph's fill can never be painted over by a neighboring glyph's
   * outline/shadow.
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
 * Binds `material` with the atlas of the batch's font: its texture and the
 * metrics the MSDF shaders turn distances into screen pixels with.
 */
const bindFontAtlas = (
  material: Material,
  gl: WebGL2RenderingContext,
  command: RenderCommand,
): void => {
  const { fontAtlas } = command;

  if (!fontAtlas) {
    throw new Error(
      'A text render command must name the font atlas its glyph is drawn from.',
    );
  }

  material.setUniform('u_atlas', fontAtlas.texture);
  material.setUniform('u_distanceRange', fontAtlas.data.distanceRange);
  material.setUniform('u_atlasSize', fontAtlas.data.atlasSize.height);
  material.bind(gl);
};

/**
 * Builds the pair of `Renderable`s glyphs are drawn with: the MSDF
 * fill/effects shaders with their instance layouts. The render system
 * creates one pair and draws every font with it, binding each batch's font
 * atlas (the command's `fontAtlas`) as it goes; consecutive glyphs of the
 * same atlas batch into one instanced draw call, like sprites of the same
 * texture.
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
 * @param renderContext - The render context to build the renderables with.
 * @returns The renderables.
 */
export function createTextRenderables(
  renderContext: RenderContext,
): TextRenderables {
  const { shaderCache } = renderContext;

  const fillMaterial = new Material(
    renderContext,
    shaderCache.getShader('msdf-fill.vert'),
    shaderCache.getShader('msdf-fill.frag'),
  );
  const fillLayout = combineInstanceDataSegments(
    spriteInstanceDataSegment,
    textEmboldenInstanceDataSegment,
  );
  const fillRenderable = new Renderable(
    fillMaterial,
    fillLayout.floatsPerInstance,
    fillLayout.bindInstanceData,
    fillLayout.setupInstanceAttributes,
    (gl, command) => bindFontAtlas(fillMaterial, gl, command),
  );

  // `msdf.vert` extends `msdf-fill.vert` verbatim, adding only the
  // per-instance forwarding outline/shadow effects need (see
  // `msdf.vert.glsl`).
  const effectsMaterial = new Material(
    renderContext,
    shaderCache.getShader('msdf.vert'),
    shaderCache.getShader('msdf-effects.frag'),
  );
  const effectsLayout = combineInstanceDataSegments(
    spriteInstanceDataSegment,
    textEmboldenInstanceDataSegment,
    textEffectsInstanceDataSegment,
  );
  const effectsRenderable = new Renderable(
    effectsMaterial,
    effectsLayout.floatsPerInstance,
    effectsLayout.bindInstanceData,
    effectsLayout.setupInstanceAttributes,
    (gl, command) => bindFontAtlas(effectsMaterial, gl, command),
  );

  return { fillRenderable, effectsRenderable };
}
