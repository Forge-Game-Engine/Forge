import { Material } from '../../rendering/materials/material.js';
import { Renderable } from '../../rendering/renderable.js';
import { RenderContext } from '../../rendering/render-context.js';
import {
  getUiQuadGeometry,
  UI_RENDER_LAYER,
} from '../utilities/create-ui-renderable.js';
import type { FontAsset } from './types/font-asset.js';
import {
  bindTextGlyphInstanceData,
  setupTextInstanceAttributes,
  TEXT_FLOATS_PER_INSTANCE,
  type TextGlyphInstanceComponents,
} from './text-instance-layout.js';

/** Module-level cache so one `Renderable` is shared per font asset. */
const renderableCache = new WeakMap<
  FontAsset,
  Renderable<TextGlyphInstanceComponents>
>();

/**
 * Builds (or returns a cached) `Renderable<TextGlyphInstanceComponents>` for
 * the given font asset.
 *
 * The renderable uses the built-in SDF text shader and pre-sets the atlas
 * texture and MSDF flag so the material is ready on first use.
 *
 * Share one `Renderable` across all text entities using the same font to
 * maximise instanced batching — the UI text system groups draw calls by
 * `Renderable` identity.
 *
 * @param renderContext - The WebGL render context.
 * @param font - The font asset whose atlas texture the renderable will use.
 * @param layer - Optional rendering layer. Defaults to `UI_RENDER_LAYER`.
 * @returns A `Renderable<TextGlyphInstanceComponents>` ready for use with
 *   {@link UiTextEcsComponent}.
 */
export function createUiTextRenderable(
  renderContext: RenderContext,
  font: FontAsset,
  layer: number = UI_RENDER_LAYER,
): Renderable<TextGlyphInstanceComponents> {
  const cached = renderableCache.get(font);

  if (cached) {
    return cached;
  }

  const { gl, shaderCache } = renderContext;
  const geometry = getUiQuadGeometry(gl);
  const material = new Material(
    shaderCache.getShader('text.vert'),
    shaderCache.getShader('text.frag'),
    gl,
  );

  material.setUniform('u_atlas', font.texture);
  material.setUniform('u_msdf', font.sdfType === 'msdf');

  const renderable = new Renderable<TextGlyphInstanceComponents>(
    geometry,
    material,
    TEXT_FLOATS_PER_INSTANCE,
    layer,
    bindTextGlyphInstanceData,
    setupTextInstanceAttributes,
  );

  renderableCache.set(font, renderable);

  return renderable;
}
