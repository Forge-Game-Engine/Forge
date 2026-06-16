import { Material } from '../../rendering/materials/material.js';
import {
  BindInstanceDataCallback,
  Renderable,
  SetupInstanceAttributesCallback,
} from '../../rendering/renderable.js';
import { createQuadGeometry } from '../../rendering/geometry/create-quad-geometry.js';
import { RenderContext } from '../../rendering/render-context.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { UI_RENDER_LAYER } from './create-ui-renderable.js';

/**
 * Options for {@link createCustomUiRenderable}.
 *
 * ## Shader contract
 *
 * A custom UI shader must honour the following to integrate with the UI render
 * system:
 *
 * - It receives the `u_projection` (mat3) uniform and **must** apply it.
 * - It receives per-instance `a_worldMat0/1/2` (vec3) attributes encoding the
 *   element's world matrix and **must** use them to position vertices.
 * - If clipping is desired, it should implement the `a_clipRect` (vec4)
 *   analytic clip test that the default shader performs.
 *
 * Use the default UI shader source (`uiVertexShader` / `uiFragmentShader`
 * exported from `@forge/ui/shaders`) as a copy-paste starting point.
 */
export interface CreateCustomUiRenderableOptions {
  /** GLSL source for the vertex shader. */
  vertexSource: string;

  /** GLSL source for the fragment shader. */
  fragmentSource: string;

  /**
   * Total floats per instance in the custom instance buffer layout.
   * Must match the combined size of all per-instance attributes declared in
   * the vertex shader.
   */
  floatsPerInstance: number;

  /**
   * Callback that writes one element's per-instance data into the buffer.
   * The callback receives the same `UiInstanceComponents` resolved by the UI
   * render system, so transform and standard style data are always available.
   */
  bindInstanceData: BindInstanceDataCallback<UiInstanceComponents>;

  /**
   * Callback that wires the instance buffer's attributes to the shader's
   * attribute locations via `vertexAttribPointer` + `vertexAttribDivisor`.
   */
  setupInstanceAttributes: SetupInstanceAttributesCallback<UiInstanceComponents>;

  /**
   * Rendering layer. Defaults to `DEFAULT_LAYERS.ui`.
   */
  layer?: number;
}

/**
 * Builds a custom `Renderable<UiInstanceComponents>` for UI elements that need
 * effects beyond the default shader.
 *
 * The returned renderable is batched by the UI render system like any other;
 * the only difference is that it uses the caller-supplied GLSL and instance
 * layout.
 *
 * @param renderContext - The WebGL render context.
 * @param options - Custom shader sources, instance layout, and optional layer.
 * @returns A renderable ready for use with {@link UiRenderableEcsComponent}.
 */
export function createCustomUiRenderable(
  renderContext: RenderContext,
  options: CreateCustomUiRenderableOptions,
): Renderable<UiInstanceComponents> {
  const {
    vertexSource,
    fragmentSource,
    floatsPerInstance,
    bindInstanceData,
    setupInstanceAttributes,
    layer = UI_RENDER_LAYER,
  } = options;

  const { gl } = renderContext;

  const geometry = createQuadGeometry(gl);
  const material = new Material(vertexSource, fragmentSource, gl);

  return new Renderable<UiInstanceComponents>(
    geometry,
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );
}
