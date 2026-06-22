import { Material } from '../../rendering/materials/material.js';
import { Geometry } from '../../rendering/geometry/geometry.js';
import { Renderable } from '../../rendering/renderable.js';
import { RenderContext } from '../../rendering/render-context.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import {
  bindUiInstanceData,
  setupUiInstanceAttributes,
  UI_FLOATS_PER_INSTANCE,
} from './ui-instance-layout.js';

// The UI vertex shader uses a_texCoord ([0,1]²) as vertex positions rather
// than the centred a_position ([-0.5,0.5]²) used by sprite shaders.
// Using a dedicated geometry avoids a spurious "Attribute a_position not found"
// warning when both sprite and UI renderables share the same GL context.
const uiQuadGeometryCache = new WeakMap<WebGL2RenderingContext, Geometry>();

export function getUiQuadGeometry(gl: WebGL2RenderingContext): Geometry {
  const cached = uiQuadGeometryCache.get(gl);

  if (cached) {
    return cached;
  }

  const geometry = new Geometry();
  const buffer = gl.createBuffer();

  if (!buffer) {
    throw new Error('Failed to create WebGL buffer for UI quad geometry');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    // Two triangles covering [0,1]×[0,1]
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    gl.STATIC_DRAW,
  );

  geometry.addAttribute(gl, 'a_texCoord', { buffer, size: 2 });

  uiQuadGeometryCache.set(gl, geometry);

  return geometry;
}

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
  const { gl, shaderCache } = renderContext;

  const geometry = getUiQuadGeometry(gl);
  const material = new Material(
    shaderCache.getShader('ui.vert'),
    shaderCache.getShader('ui.frag'),
    gl,
  );

  return new Renderable<UiInstanceComponents>(
    geometry,
    material,
    UI_FLOATS_PER_INSTANCE,
    layer,
    bindUiInstanceData,
    setupUiInstanceAttributes,
  );
}
