import { Material } from '../../rendering/materials/material.js';
import { Renderable } from '../../rendering/renderable.js';
import { createQuadGeometry } from '../../rendering/geometry/create-quad-geometry.js';
import { RenderContext } from '../../rendering/render-context.js';
import { uiFragmentShader, uiVertexShader } from '../shaders/index.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import {
  bindUiInstanceData,
  setupUiInstanceAttributes,
  UI_FLOATS_PER_INSTANCE,
} from './ui-instance-layout.js';

/** Default numeric render layer for UI renderables. */
export const UI_RENDER_LAYER = 1 << 8;

/**
 * Options for {@link createUiRenderable}.
 */
export interface CreateUiRenderableOptions {
  /**
   * Rendering layer for this renderable.
   * Defaults to `DEFAULT_LAYERS.ui`.
   */
  layer?: number;
}

const defaultCreateUiRenderableOptions: Required<CreateUiRenderableOptions> = {
  layer: UI_RENDER_LAYER,
};

/**
 * Builds a `Renderable<UiInstanceComponents>` backed by the default UI shader.
 *
 * All UI elements that share the same layer will batch together in a single
 * instanced draw call as long as they reference the same `Renderable` instance.
 * Call this once per layer and share the result across elements to maximise
 * batching.
 *
 * @param renderContext - The WebGL render context.
 * @param options - Optional configuration.
 * @returns A renderable ready for use with {@link UiRenderableEcsComponent}.
 */
export function createUiRenderable(
  renderContext: RenderContext,
  options: CreateUiRenderableOptions = {},
): Renderable<UiInstanceComponents> {
  const { layer } = { ...defaultCreateUiRenderableOptions, ...options };
  const { gl } = renderContext;

  const geometry = createQuadGeometry(gl);
  const material = new Material(uiVertexShader, uiFragmentShader, gl);

  return new Renderable<UiInstanceComponents>(
    geometry,
    material,
    UI_FLOATS_PER_INSTANCE,
    layer,
    bindUiInstanceData,
    setupUiInstanceAttributes,
  );
}
