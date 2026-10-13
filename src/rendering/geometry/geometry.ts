import { Rect, Rects } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';
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

/**
 * The primitives a {@link Geometry}'s vertices (or indices) make up:
 * - `'triangles'`: every three vertices are a triangle.
 * - `'triangleStrip'`: every vertex after the first two makes a triangle
 *   with the two before it.
 * - `'lines'`: every two vertices are a line.
 * - `'lineStrip'`: a line through every vertex in turn.
 * - `'points'`: every vertex is a point.
 */
export type GeometryTopology =
  'triangles' | 'triangleStrip' | 'lines' | 'lineStrip' | 'points';

/**
 * The indices of an indexed {@link Geometry}: which vertices, in order, make
 * up its primitives.
 */
export type GeometryIndices = Uint16Array | Uint32Array;

/**
 * The vertex data and topology of a {@link Geometry}.
 */
export interface GeometryOptions {
  /**
   * The vertex attributes. Every attribute holds the same number of
   * vertices, which is the geometry's {@link Geometry.vertexCount}.
   */
  attributes: readonly GeometryAttribute[];

  /**
   * The indices to draw the vertices in. Leave out to draw the vertices in
   * order. A geometry created without indices can't be given them by
   * {@link Geometry.update}.
   */
  indices?: GeometryIndices;

  /** The primitives the geometry is drawn as. Defaults to `'triangles'`. */
  topology?: GeometryTopology;
}

const defaultGeometryOptions: { topology: GeometryTopology } = {
  topology: 'triangles',
};

/**
 * New vertex data for {@link Geometry.update}.
 */
export interface GeometryUpdate {
  /**
   * The number of vertices to draw, which can be less than the attribute
   * data holds. Every attribute has to hold at least this many vertices.
   */
  vertexCount: number;

  /**
   * New data for some or all of the attributes, by name. Only the first
   * `vertexCount * size` floats are uploaded, so the same array can be
   * reused, and filled again, every frame. An attribute left out keeps its
   * data. Defaults to no new attribute data.
   */
  attributes?: Readonly<Record<string, Float32Array>>;

  /**
   * New indices, all of which are drawn (pass a `subarray` to draw fewer).
   * Leave out to keep the indices the geometry has.
   */
  indices?: GeometryIndices;
}

const defaultGeometryUpdate: {
  attributes: Readonly<Record<string, Float32Array>>;
} = {
  attributes: {},
};

/** The attribute {@link Geometry.bounds} reads vertex positions from. */
const positionAttributeName = 'a_position';

const glTopologyNames: Record<
  GeometryTopology,
  'TRIANGLES' | 'TRIANGLE_STRIP' | 'LINES' | 'LINE_STRIP' | 'POINTS'
> = {
  triangles: 'TRIANGLES',
  triangleStrip: 'TRIANGLE_STRIP',
  lines: 'LINES',
  lineStrip: 'LINE_STRIP',
  points: 'POINTS',
};

/** A GL buffer and the CPU-side data it's uploaded from. */
interface BufferState<TData extends Float32Array | GeometryIndices> {
  /**
   * The latest data. The geometry keeps a reference, not a copy, and
   * uploads it again when a lost context is restored.
   */
  data: TData;

  /** How many elements of `data`, from the start, are in the buffer. */
  length: number;

  /**
   * Whether the data has ever been updated. A dynamic buffer is allocated
   * with `DYNAMIC_DRAW` and room to grow; a static one holds exactly its
   * data, with `STATIC_DRAW`.
   */
  dynamic: boolean;

  /**
   * The size of a dynamic buffer's data store, in bytes. `0` while it's
   * static or not allocated.
   */
  capacity: number;

  /** `null` while the WebGL context is lost, until it's restored. */
  buffer: WebGLBuffer | null;
}

interface AttributeState extends BufferState<Float32Array> {
  readonly name: string;
  readonly size: number;
}

/**
 * Returns the smallest power of two at least `byteLength` (and at least
 * `1`), so a buffer that keeps growing is reallocated a logarithmic number
 * of times.
 * @param byteLength - The number of bytes the buffer has to hold.
 * @returns The capacity to allocate, in bytes.
 */
function getCapacity(byteLength: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(byteLength, 1)));
}

/**
 * Returns the number of vertices the attributes hold.
 * @param attributes - The geometry's attributes.
 * @returns The number of vertices, `0` if there are no attributes.
 * @throws An error if an attribute's data isn't a whole number of vertices,
 * or the attributes hold different numbers of vertices.
 */
function getVertexCount(attributes: readonly GeometryAttribute[]): number {
  let vertexCount: number | null = null;

  for (const { name, data, size } of attributes) {
    if (data.length % size !== 0) {
      throw new Error(
        `Unable to create geometry: attribute "${name}" has ${data.length} floats, which isn't a whole number of vertices of size ${size}.`,
      );
    }

    const attributeVertexCount = data.length / size;

    if (vertexCount !== null && attributeVertexCount !== vertexCount) {
      throw new Error(
        `Unable to create geometry: attribute "${name}" holds ${attributeVertexCount} vertices, but the attributes before it hold ${vertexCount}.`,
      );
    }

    vertexCount = attributeVertexCount;
  }

  return vertexCount ?? 0;
}

/**
 * Vertex data on the GPU: one buffer per attribute, and optionally an index
 * buffer, drawn as {@link Geometry.topology} with a material whose vertex
 * shader reads those attributes. The geometry keeps its latest vertex data,
 * so the render context can upload it again if the WebGL context is lost
 * and restored.
 *
 * Call {@link Geometry.update} to change the vertex data, as often as every
 * frame for a mesh that changes shape (a trail, a rope, debug lines). Only
 * the data is written: the geometry's buffers and vertex arrays are reused.
 *
 * Whoever creates a geometry owns it, and calls {@link Geometry.dispose}
 * once nothing draws it any more. `renderContext.quadGeometry` belongs to
 * the render context.
 */
export class Geometry {
  /** The primitives the geometry is drawn as. */
  public readonly topology: GeometryTopology;

  private readonly _renderContext: RenderContext;
  private readonly _attributes: readonly AttributeState[];
  private readonly _indices: BufferState<GeometryIndices> | null;
  private readonly _vaoCache: Map<WebGLProgram, WebGLVertexArrayObject> =
    new Map();
  private readonly _rebuild: () => void;
  private _vertexCount: number;
  private _bounds: Rect | null = null;
  private _isDisposed = false;

  /**
   * Creates a geometry from vertex data, uploading each attribute, and the
   * indices, to a buffer of its own (or, while the WebGL context is lost,
   * when it's restored).
   * @param renderContext - The render context to create the geometry in.
   * @param options - The vertex data and topology.
   * @throws An error if an attribute's data isn't a whole number of
   * vertices, or the attributes hold different numbers of vertices.
   */
  constructor(renderContext: RenderContext, options: GeometryOptions) {
    const { attributes, indices, topology } = withDefaults(
      defaultGeometryOptions,
      options,
    );

    this._renderContext = renderContext;
    this.topology = topology;
    this._vertexCount = getVertexCount(attributes);
    this._attributes = attributes.map(({ name, data, size }) => ({
      name,
      size,
      data,
      length: data.length,
      dynamic: false,
      capacity: 0,
      buffer: null,
    }));
    this._indices = indices
      ? {
          data: indices,
          length: indices.length,
          dynamic: false,
          capacity: 0,
          buffer: null,
        }
      : null;

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
   * The number of vertices drawn, set by the constructor and
   * {@link Geometry.update}. The buffers can hold more.
   */
  get vertexCount(): number {
    return this._vertexCount;
  }

  /**
   * The axis-aligned rectangle around the x and y of the first
   * {@link Geometry.vertexCount} vertices of the `a_position` attribute, in
   * the space the vertices are in. Computed when first read after the
   * geometry is created or {@link Geometry.update} changes `a_position` or
   * `vertexCount`, and kept until then. A zero-size rectangle at the origin
   * when there are no vertices.
   *
   * The render system culls a mesh (see `MeshEcsComponent`) whose bounds,
   * placed by its entity's transform, are outside the camera's view.
   * @throws An error if the geometry has no `a_position` attribute, or its
   * `a_position` has fewer than 2 components.
   */
  get bounds(): Rect {
    this._bounds ??= this._computeBounds();

    return this._bounds;
  }

  /**
   * Whether {@link Geometry.dispose} has freed the geometry, so it can't be
   * drawn any more.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Reads how many components per vertex an attribute has.
   * @param name - The attribute's name.
   * @returns The attribute's `size`, or `null` if the geometry has no
   * attribute called `name`.
   */
  public getAttributeSize(name: string): number | null {
    return this._findAttribute(name)?.size ?? null;
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
   * Draws the geometry as its {@link Geometry.topology}: its indices, if it
   * has them, or else its first {@link Geometry.vertexCount} vertices.
   * {@link Geometry.bind} it with the material to draw with first. Draws
   * nothing while the WebGL context is lost.
   */
  public draw(): void {
    if (this._renderContext.isContextLost) {
      return;
    }

    const { gl } = this._renderContext;
    const mode = gl[glTopologyNames[this.topology]];

    if (!this._indices) {
      gl.drawArrays(mode, 0, this._vertexCount);

      return;
    }

    gl.drawElements(
      mode,
      this._indices.length,
      this._getIndexType(this._indices),
      0,
    );
  }

  /**
   * Draws `instanceCount` instances of the geometry, the way
   * {@link Geometry.draw} draws one. Per-instance attributes come from
   * whatever buffers were set up on the bound vertex array. Draws nothing
   * while the WebGL context is lost.
   * @param instanceCount - The number of instances to draw.
   */
  public drawInstanced(instanceCount: number): void {
    if (this._renderContext.isContextLost) {
      return;
    }

    const { gl } = this._renderContext;
    const mode = gl[glTopologyNames[this.topology]];

    if (!this._indices) {
      gl.drawArraysInstanced(mode, 0, this._vertexCount, instanceCount);

      return;
    }

    gl.drawElementsInstanced(
      mode,
      this._indices.length,
      this._getIndexType(this._indices),
      0,
      instanceCount,
    );
  }

  /**
   * Replaces some or all of the geometry's vertex data, and the number of
   * vertices to draw. Writes into the existing buffers with
   * `gl.bufferSubData` while the data fits, and grows a buffer to the next
   * power of two bytes when it doesn't, so a mesh that grows a little each
   * frame is only reallocated now and then. A buffer keeps its WebGL
   * object when it grows, so no buffer or vertex array is ever created.
   *
   * The first update of a buffer reallocates it once, with
   * `gl.DYNAMIC_DRAW`. A geometry that's never updated keeps
   * `gl.STATIC_DRAW` buffers.
   *
   * The geometry keeps a reference to every array it's given, not a copy,
   * and uploads it again if the WebGL context is lost and restored. While
   * the context is lost, the data is only recorded.
   * @param update - The new vertex data.
   * @throws An error if `vertexCount` isn't a non-negative integer, an
   * attribute is named that the geometry doesn't have, an attribute holds
   * fewer than `vertexCount` vertices, or indices are given to a geometry
   * created without them.
   */
  public update(update: GeometryUpdate): void {
    const { vertexCount, attributes, indices } = withDefaults(
      defaultGeometryUpdate,
      update,
    );

    this._validateUpdate(vertexCount, attributes, indices);

    const updatedAttributes = this._attributes.filter(({ name }) =>
      Object.hasOwn(attributes, name),
    );

    if (
      vertexCount !== this._vertexCount ||
      Object.hasOwn(attributes, positionAttributeName)
    ) {
      this._bounds = null;
    }

    this._vertexCount = vertexCount;

    for (const attribute of updatedAttributes) {
      attribute.data = attributes[attribute.name];
      attribute.length = vertexCount * attribute.size;
      attribute.dynamic = true;
    }

    if (indices && this._indices) {
      this._indices.data = indices;
      this._indices.length = indices.length;
      this._indices.dynamic = true;
    }

    if (this._renderContext.isContextLost) {
      return;
    }

    const { gl } = this._renderContext;

    for (const attribute of updatedAttributes) {
      this._writeBuffer(gl.ARRAY_BUFFER, attribute);
    }

    if (indices && this._indices) {
      // The element array binding is part of the bound vertex array's state.
      gl.bindVertexArray(null);
      this._writeBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indices);
    }
  }

  /**
   * Frees the geometry's buffers and vertex arrays, and stops the render
   * context rebuilding it. Disposing it again does nothing.
   */
  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    const { gl } = this._renderContext;

    unregisterGpuResource(this._renderContext, 'geometry', this._rebuild);

    for (const vao of this._vaoCache.values()) {
      gl.deleteVertexArray(vao);
    }

    for (const state of this._getBufferStates()) {
      gl.deleteBuffer(state.buffer);
      state.buffer = null;
    }

    this._vaoCache.clear();
  }

  private _validateUpdate(
    vertexCount: number,
    attributes: Readonly<Record<string, Float32Array>>,
    indices: GeometryIndices | undefined,
  ): void {
    if (!Number.isInteger(vertexCount) || vertexCount < 0) {
      throw new Error(
        `Unable to update geometry: vertexCount must be a non-negative integer (got ${vertexCount}).`,
      );
    }

    for (const name of Object.keys(attributes)) {
      if (!this._attributes.some((attribute) => attribute.name === name)) {
        throw new Error(
          `Unable to update geometry: it has no attribute "${name}".`,
        );
      }
    }

    for (const { name, size, length } of this._attributes) {
      const available = Object.hasOwn(attributes, name)
        ? attributes[name].length
        : length;

      if (available < vertexCount * size) {
        throw new Error(
          `Unable to update geometry: attribute "${name}" holds ${Math.floor(available / size)} vertices, fewer than the vertexCount of ${vertexCount}.`,
        );
      }
    }

    if (indices && !this._indices) {
      throw new Error(
        'Unable to update geometry: it was created without indices, so it cannot be given them.',
      );
    }
  }

  private _findAttribute(name: string): AttributeState | undefined {
    return this._attributes.find((attribute) => attribute.name === name);
  }

  private _computeBounds(): Rect {
    const position = this._findAttribute(positionAttributeName);

    if (!position) {
      throw new Error(
        `Unable to compute the geometry's bounds: it has no "${positionAttributeName}" attribute.`,
      );
    }

    if (position.size < 2) {
      throw new Error(
        `Unable to compute the geometry's bounds: its "${positionAttributeName}" attribute needs at least 2 components (x and y), but it has ${position.size}.`,
      );
    }

    if (this._vertexCount === 0) {
      return Rects.zero;
    }

    const { data, size } = position;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < this._vertexCount * size; i += size) {
      const x = data[i];
      const y = data[i + 1];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  }

  private _getBufferStates(): BufferState<Float32Array | GeometryIndices>[] {
    return this._indices
      ? [...this._attributes, this._indices]
      : [...this._attributes];
  }

  private _getIndexType(indices: BufferState<GeometryIndices>): GLenum {
    const { gl } = this._renderContext;

    return indices.data instanceof Uint32Array
      ? gl.UNSIGNED_INT
      : gl.UNSIGNED_SHORT;
  }

  private _createBuffers(): void {
    const { gl } = this._renderContext;

    for (const attribute of this._attributes) {
      attribute.buffer = gl.createBuffer();
      attribute.capacity = 0;
      this._writeBuffer(gl.ARRAY_BUFFER, attribute);
    }

    if (this._indices) {
      // The element array binding is part of the bound vertex array's state.
      gl.bindVertexArray(null);
      this._indices.buffer = gl.createBuffer();
      this._indices.capacity = 0;
      this._writeBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indices);
    }
  }

  /**
   * Uploads a buffer's data: all of it with `STATIC_DRAW` while it's
   * static, or its first `length` elements into a `DYNAMIC_DRAW` store,
   * grown first if they don't fit.
   * @param target - The buffer's binding point.
   * @param state - The buffer to upload.
   */
  private _writeBuffer(
    target: GLenum,
    state: BufferState<Float32Array | GeometryIndices>,
  ): void {
    const { gl } = this._renderContext;
    const { data, length } = state;

    gl.bindBuffer(target, state.buffer);

    if (!state.dynamic) {
      gl.bufferData(target, data, gl.STATIC_DRAW);

      return;
    }

    const byteLength = length * data.BYTES_PER_ELEMENT;

    if (state.capacity === 0 || byteLength > state.capacity) {
      state.capacity = getCapacity(byteLength);
      gl.bufferData(target, state.capacity, gl.DYNAMIC_DRAW);
    }

    if (length > 0) {
      gl.bufferSubData(target, 0, data, 0, length);
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
        console.warn(`Attribute ${name} not found in shader`);

        continue;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    }

    if (this._indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indices.buffer);
    }

    gl.bindVertexArray(null);

    return vao;
  }
}
