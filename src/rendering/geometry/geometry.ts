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
 * A range of a {@link Geometry}'s elements, written with
 * {@link GeometryOptions.sections} or {@link GeometryUpdate.sections}. An
 * element is an index position if the geometry has indices, or else a
 * vertex.
 */
export interface GeometrySectionOptions {
  /**
   * The first element of the range. For `'triangles'` a multiple of 3, and
   * for `'lines'` a multiple of 2, so the range starts on a whole primitive.
   */
  start: number;

  /**
   * The number of elements in the range. `0` is allowed and draws nothing.
   * For `'triangles'` a multiple of 3, and for `'lines'` a multiple of 2.
   */
  count: number;
}

/**
 * A range of a {@link Geometry}'s elements that a mesh can draw on its own
 * (see `MeshEcsComponent.section`), with bounds of its own to be culled
 * with. Read them from {@link Geometry.sections}.
 */
export interface GeometrySection {
  /** The first element of the range. */
  readonly start: number;

  /** The number of elements in the range. */
  readonly count: number;

  /**
   * The axis-aligned rectangle around the x and y of the `a_position` of
   * every vertex the section draws, in the space the vertices are in.
   * Computed when first read after the section is written, or after
   * {@link Geometry.update} changes `a_position`, the indices or
   * `vertexCount`, and kept until then. A zero-size rectangle at the origin
   * when `count` is `0`. The indices themselves aren't checked when they're
   * written, so an index at or past the vertex count throws here.
   * @throws An error if the geometry has no `a_position` attribute of 2 or
   * more components, or an index in the section points at or past
   * {@link Geometry.vertexCount}.
   */
  readonly bounds: Rect;
}

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

  /**
   * Ranges of the geometry's elements that meshes can draw on their own
   * (see {@link Geometry.sections}). Each has to fit inside the indices (or
   * the vertices, without indices) and start and end on a whole primitive.
   * Defaults to none.
   */
  sections?: readonly GeometrySectionOptions[];
}

const defaultGeometryOptions: {
  topology: GeometryTopology;
  sections: readonly GeometrySectionOptions[];
} = {
  topology: 'triangles',
  sections: [],
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

  /**
   * New sections, replacing all of the geometry's (see
   * {@link Geometry.sections}), checked against the indices (or the
   * `vertexCount`, without indices) the update leaves the geometry with.
   * Leave out to keep the current sections, which are checked the same way,
   * so an update that would leave one out of range throws.
   */
  sections?: readonly GeometrySectionOptions[];
}

const defaultGeometryUpdate: {
  attributes: Readonly<Record<string, Float32Array>>;
} = {
  attributes: {},
};

/** The attribute {@link Geometry.bounds} reads vertex positions from. */
const positionAttributeName = 'a_position';

/**
 * The number of elements a section's `start` and `count` must be multiples
 * of, so it holds whole primitives. A strip's primitives share elements, so
 * any range of one is whole.
 */
const sectionAlignments: Record<GeometryTopology, number> = {
  triangles: 3,
  triangleStrip: 1,
  lines: 2,
  lineStrip: 1,
  points: 1,
};

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
 * A section of a {@link Geometry}, holding its bounds once they're
 * computed.
 */
class Section implements GeometrySection {
  public readonly start: number;
  public readonly count: number;

  private readonly _computeBounds: (section: Section) => Rect;
  private _bounds: Rect | null = null;

  constructor(
    { start, count }: GeometrySectionOptions,
    computeBounds: (section: Section) => Rect,
  ) {
    this.start = start;
    this.count = count;
    this._computeBounds = computeBounds;
  }

  get bounds(): Rect {
    this._bounds ??= this._computeBounds(this);

    return this._bounds;
  }

  /** Forgets the computed bounds, after the data they came from changed. */
  public clearBounds(): void {
    this._bounds = null;
  }
}

/**
 * Throws if a section isn't a whole number of primitives inside a
 * geometry's elements.
 * @param sections - The sections to check.
 * @param elementCount - The number of elements the sections index into.
 * @param elementName - What the elements are, for errors.
 * @param topology - The geometry's topology.
 * @param action - What the caller was doing, for errors.
 * @throws An error naming the first section that's invalid.
 */
function validateSections(
  sections: readonly GeometrySectionOptions[],
  elementCount: number,
  elementName: 'indices' | 'vertices',
  topology: GeometryTopology,
  action: 'create' | 'update',
): void {
  const alignment = sectionAlignments[topology];

  for (const [index, { start, count }] of sections.entries()) {
    const section = `section ${index} (start ${start}, count ${count})`;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(count) ||
      start < 0 ||
      count < 0
    ) {
      throw new Error(
        `Unable to ${action} geometry: ${section} needs a start and count that are non-negative integers.`,
      );
    }

    if (start + count > elementCount) {
      throw new Error(
        `Unable to ${action} geometry: ${section} ends past its ${elementCount} ${elementName}.`,
      );
    }

    if (start % alignment !== 0 || count % alignment !== 0) {
      throw new Error(
        `Unable to ${action} geometry: ${section} isn't whole ${topology}, so its start and count need to be multiples of ${alignment}.`,
      );
    }
  }
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
  private readonly _computeSectionBounds: (section: Section) => Rect;
  private _vertexCount: number;
  private _bounds: Rect | null = null;
  private _sections: readonly Section[];

  /**
   * Creates a geometry from vertex data, uploading each attribute, and the
   * indices, to a buffer of its own (or, while the WebGL context is lost,
   * when it's restored).
   * @param renderContext - The render context to create the geometry in.
   * @param options - The vertex data and topology.
   * @throws An error if an attribute's data isn't a whole number of
   * vertices, the attributes hold different numbers of vertices, or a
   * section isn't a non-negative integer range of whole primitives inside
   * the indices (or the vertices, without indices).
   */
  constructor(renderContext: RenderContext, options: GeometryOptions) {
    const { attributes, indices, topology, sections } = withDefaults(
      defaultGeometryOptions,
      options,
    );
    const vertexCount = getVertexCount(attributes);

    validateSections(
      sections,
      indices ? indices.length : vertexCount,
      indices ? 'indices' : 'vertices',
      topology,
      'create',
    );

    this._renderContext = renderContext;
    this.topology = topology;
    this._vertexCount = vertexCount;
    this._computeSectionBounds = (section): Rect =>
      this._computeSectionBoundsOf(section);
    this._sections = this._createSections(sections);
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
   * The geometry's sections, in the order the constructor or
   * {@link Geometry.update} wrote them: ranges of its elements, each with
   * bounds of its own, that a mesh can draw and be culled by on its own (see
   * `MeshEcsComponent.section`). Empty for a geometry without sections.
   */
  get sections(): readonly GeometrySection[] {
    return this._sections;
  }

  /**
   * The number of elements the geometry draws: its index count if it has
   * indices, or else {@link Geometry.vertexCount}. Sections and
   * {@link Geometry.drawRange} count in elements.
   */
  get elementCount(): number {
    return this._indices ? this._indices.length : this._vertexCount;
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
    this.drawRange(0, this.elementCount);
  }

  /**
   * Draws `count` of the geometry's elements from `start`, as its
   * {@link Geometry.topology}: indices from position `start` if it has
   * indices, or else vertices from vertex `start`. {@link Geometry.bind} it
   * with the material to draw with first. Draws nothing while the WebGL
   * context is lost.
   * @param start - The first element to draw.
   * @param count - The number of elements to draw.
   * @throws An error if `start` and `count` aren't non-negative integers, or
   * the range ends past {@link Geometry.elementCount}.
   */
  public drawRange(start: number, count: number): void {
    const { elementCount } = this;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(count) ||
      start < 0 ||
      count < 0 ||
      start + count > elementCount
    ) {
      throw new Error(
        `Unable to draw geometry range (start ${start}, count ${count}): it needs non-negative integers that end inside the geometry's ${elementCount} elements.`,
      );
    }

    if (this._renderContext.isContextLost) {
      return;
    }

    const { gl } = this._renderContext;
    const mode = gl[glTopologyNames[this.topology]];

    if (!this._indices) {
      gl.drawArrays(mode, start, count);

      return;
    }

    gl.drawElements(
      mode,
      count,
      this._getIndexType(this._indices),
      start * this._indices.data.BYTES_PER_ELEMENT,
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
   * fewer than `vertexCount` vertices, indices are given to a geometry
   * created without them, or a section (given, or kept when `sections` is
   * left out) isn't a non-negative integer range of whole primitives inside
   * the elements the update leaves. A throwing update changes nothing.
   */
  public update(update: GeometryUpdate): void {
    const { vertexCount, attributes, indices, sections } = withDefaults(
      defaultGeometryUpdate,
      update,
    );

    this._validateUpdate(vertexCount, attributes, indices, sections);

    const updatedAttributes = this._attributes.filter(({ name }) =>
      Object.hasOwn(attributes, name),
    );
    const positionsChanged =
      vertexCount !== this._vertexCount ||
      Object.hasOwn(attributes, positionAttributeName);

    if (positionsChanged) {
      this._bounds = null;
    }

    if (positionsChanged || indices) {
      for (const section of this._sections) {
        section.clearBounds();
      }
    }

    if (sections) {
      this._sections = this._createSections(sections);
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
   * context rebuilding it.
   */
  public dispose(): void {
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
    sections: readonly GeometrySectionOptions[] | undefined,
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

    validateSections(
      sections ?? this._sections,
      this._getUpdatedElementCount(vertexCount, indices),
      this._indices ? 'indices' : 'vertices',
      this.topology,
      'update',
    );
  }

  /**
   * The {@link Geometry.elementCount} an update leaves the geometry with.
   * @param vertexCount - The update's vertex count.
   * @param indices - The update's indices, if it gives any.
   * @returns The number of elements.
   */
  private _getUpdatedElementCount(
    vertexCount: number,
    indices: GeometryIndices | undefined,
  ): number {
    if (!this._indices) {
      return vertexCount;
    }

    return indices ? indices.length : this._indices.length;
  }

  private _createSections(
    sections: readonly GeometrySectionOptions[],
  ): readonly Section[] {
    return sections.map(
      (section) => new Section(section, this._computeSectionBounds),
    );
  }

  private _findAttribute(name: string): AttributeState | undefined {
    return this._attributes.find((attribute) => attribute.name === name);
  }

  /**
   * Finds the `a_position` attribute that bounds are computed from.
   * @param description - What's being computed, for errors.
   * @returns The attribute.
   * @throws An error if the geometry has no `a_position`, or it has fewer
   * than 2 components.
   */
  private _getPositionAttribute(description: string): AttributeState {
    const position = this._findAttribute(positionAttributeName);

    if (!position) {
      throw new Error(
        `Unable to compute ${description}: it has no "${positionAttributeName}" attribute.`,
      );
    }

    if (position.size < 2) {
      throw new Error(
        `Unable to compute ${description}: its "${positionAttributeName}" attribute needs at least 2 components (x and y), but it has ${position.size}.`,
      );
    }

    return position;
  }

  /**
   * Computes a section's bounds from the positions of the vertices it
   * draws: those its indices point at, or its own range of vertices.
   * @param section - The section.
   * @returns The section's bounds.
   * @throws An error if the geometry has no usable `a_position`, or an
   * index points at or past the vertex count.
   */
  private _computeSectionBoundsOf(section: Section): Rect {
    const description = `the bounds of the geometry's section ${this._sections.indexOf(section)}`;
    const { data, size } = this._getPositionAttribute(description);
    const { start, count } = section;

    if (count === 0) {
      return Rects.zero;
    }

    const indices = this._indices?.data ?? null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let element = start; element < start + count; element++) {
      const vertex = indices ? indices[element] : element;

      if (vertex >= this._vertexCount) {
        throw new Error(
          `Unable to compute ${description}: index ${element} points at vertex ${vertex}, but the geometry has ${this._vertexCount} vertices.`,
        );
      }

      const x = data[vertex * size];
      const y = data[vertex * size + 1];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  }

  private _computeBounds(): Rect {
    const position = this._getPositionAttribute("the geometry's bounds");

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
