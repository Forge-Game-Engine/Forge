import {
  registerGpuResource,
  unregisterGpuResource,
} from '../gpu-resource-registry.js';
import type { Material } from '../materials/material.js';
import type { RenderContext } from '../render-context.js';

/**
 * One vertex attribute of a {@link Geometry}: a name the vertex shader
 * declares (`in vec2 a_position;`) and the float data it reads, `size`
 * components per vertex.
 */
export interface GeometryAttribute {
  /** The attribute's name in the vertex shader. */
  name: string;

  /** The attribute's data, `size` floats per vertex. */
  data: Float32Array;

  /** The number of components per vertex (`1` to `4`). */
  size: number;
}

interface AttributeBuffer extends GeometryAttribute {
  /** `null` while the WebGL context is lost, until it's restored. */
  buffer: WebGLBuffer | null;
}

/**
 * Vertex data on the GPU: one buffer per attribute, drawn with a material
 * whose vertex shader reads those attributes. The geometry keeps its vertex
 * data, so the render context can upload it again if the WebGL context is
 * lost and restored.
 *
 * Whoever creates a geometry owns it, and calls {@link Geometry.dispose}
 * once nothing draws it any more. `renderContext.quadGeometry` belongs to
 * the render context.
 */
export class Geometry {
  private readonly _renderContext: RenderContext;
  private readonly _attributes: readonly AttributeBuffer[];
  private readonly _vaoCache: Map<WebGLProgram, WebGLVertexArrayObject> =
    new Map();
  private readonly _rebuild: () => void;

  /**
   * Creates a geometry from vertex data, uploading each attribute to a
   * buffer of its own (or, while the WebGL context is lost, when it's
   * restored).
   * @param renderContext - The render context to create the geometry in.
   * @param attributes - The vertex attributes.
   */
  constructor(
    renderContext: RenderContext,
    attributes: readonly GeometryAttribute[],
  ) {
    this._renderContext = renderContext;
    this._attributes = attributes.map((attribute) => ({
      ...attribute,
      buffer: null,
    }));

    // The old buffers and vertex arrays died with the lost context, and the
    // programs the vertex arrays were made for have been linked again.
    this._rebuild = (): void => {
      this._vaoCache.clear();
      this._createBuffers();
    };

    registerGpuResource(renderContext, 'geometry', this._rebuild);

    if (!renderContext.isContextLost) {
      this._createBuffers();
    }
  }

  /**
   * Binds the geometry's vertex array for `material`'s program, creating it
   * the first time the geometry is drawn with that program.
   * @param material - The material the geometry is about to be drawn with.
   * @throws An error if `material`'s program isn't linked yet (see
   * `Material.program`).
   */
  public bind(material: Material): void {
    const { gl } = this._renderContext;
    const { program } = material;
    let vao = this._vaoCache.get(program);

    if (!vao) {
      vao = this._createVertexArrayObject(program);
      this._vaoCache.set(program, vao);
    }

    gl.bindVertexArray(vao);
  }

  /**
   * Frees the geometry's buffers and vertex arrays, and stops the render
   * context rebuilding it.
   */
  public dispose(): void {
    const { gl } = this._renderContext;

    unregisterGpuResource(this._renderContext, 'geometry', this._rebuild);

    for (const vao of this._vaoCache.values()) {
      gl.deleteVertexArray(vao);
    }

    for (const attribute of this._attributes) {
      gl.deleteBuffer(attribute.buffer);
      attribute.buffer = null;
    }

    this._vaoCache.clear();
  }

  private _createBuffers(): void {
    const { gl } = this._renderContext;

    for (const attribute of this._attributes) {
      attribute.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, attribute.data, gl.STATIC_DRAW);
    }
  }

  private _createVertexArrayObject(
    program: WebGLProgram,
  ): WebGLVertexArrayObject {
    const { gl } = this._renderContext;
    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);

    for (const { name, buffer, size } of this._attributes) {
      const location = gl.getAttribLocation(program, name);

      if (location === -1) {
        this._renderContext.diagnostics.warn({
          code: 'geometry-attribute-not-found',
          message: `Attribute ${name} not found in shader`,
          label: name,
        });

        continue;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    }

    gl.bindVertexArray(null);

    return vao;
  }
}
