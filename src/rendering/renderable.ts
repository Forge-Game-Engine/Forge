import { Entity } from '../ecs/entity.js';
import type { Geometry } from './geometry/index.js';
import type { Material } from './materials/index.js';

/**
 * Callback function type for binding instance data to a buffer.
 * This function is responsible for writing per-instance data (e.g., transforms, colors) into a Float32Array.
 *
 * @param entity - The entity whose data should be bound
 * @param instanceDataBuffer - The Float32Array buffer to write instance data into
 * @param offset - The offset within the buffer where this instance's data should start
 */
type BindInstanceDataCallback = (
  entity: Entity,
  instanceDataBuffer: Float32Array,
  offset: number,
) => void;

/**
 * Callback function type for setting up instance attributes in WebGL.
 * This function configures the vertex attribute pointers for instanced rendering.
 *
 * @param gl - The WebGL2 rendering context
 * @param renderable - The renderable object being configured
 */
type SetupInstanceAttributes = (
  gl: WebGL2RenderingContext,
  renderable: Renderable,
) => void;

/**
 * Represents a renderable object in the rendering pipeline.
 *
 * A `Renderable` encapsulates all the information needed to render a group of entities
 * with instanced rendering. It combines geometry, material, and instance-specific callbacks
 * to efficiently render multiple entities with the same geometry and material in a single draw call.
 *
 * @example
 * ```typescript
 * const renderable = new Renderable(
 *   quadGeometry,
 *   spriteMaterial,
 *   cameraEntity,
 *   17, // floats per instance
 *   (entity, buffer, offset) => {
 *     // Bind instance data for this entity
 *     const position = entity.getComponent(PositionComponent);
 *     buffer[offset] = position.x;
 *     buffer[offset + 1] = position.y;
 *   },
 *   (gl, renderable) => {
 *     // Setup vertex attribute pointers for instanced rendering
 *     const posLoc = gl.getAttribLocation(renderable.material.program, 'a_position');
 *     gl.enableVertexAttribArray(posLoc);
 *     // ... configure attribute pointer
 *   }
 * );
 * ```
 */
export class Renderable {
  /**
   * The geometry (vertex data) to be rendered.
   * This defines the shape and structure of the mesh (e.g., a quad for sprites).
   */
  public readonly geometry: Geometry;

  /**
   * The material (shaders and uniforms) to use for rendering.
   * Defines how the geometry should be drawn (textures, colors, etc.).
   */
  public readonly material: Material;

  /**
   * The number of float values required per instance in the instance data buffer.
   * This determines how much data needs to be provided for each entity being rendered.
   */
  public readonly floatsPerInstance: number;

  /**
   * The camera entity used to view this renderable.
   * The camera's position, zoom, and other properties affect how the renderable is displayed.
   */
  public readonly cameraEntity: Entity;

  /**
   * Callback function that binds instance-specific data for an entity into a buffer.
   * Called for each entity to prepare its data for instanced rendering.
   */
  public readonly bindInstanceData: BindInstanceDataCallback;

  /**
   * Callback function that sets up WebGL vertex attribute pointers for instanced rendering.
   * Called to configure how instance data should be interpreted by the shader.
   */
  public readonly setupInstanceAttributes: SetupInstanceAttributes;

  /**
   * Creates a new Renderable.
   *
   * @param geometry - The geometry defining the shape to be rendered
   * @param material - The material defining how to render the geometry
   * @param cameraEntity - The camera entity for viewing this renderable
   * @param floatsPerInstance - The number of floats per instance in the instance buffer
   * @param bindInstanceData - Callback to bind instance data for each entity
   * @param setupInstanceAttributes - Callback to setup instance attributes in WebGL
   */
  constructor(
    geometry: Geometry,
    material: Material,
    cameraEntity: Entity,
    floatsPerInstance: number,
    bindInstanceData: BindInstanceDataCallback,
    setupInstanceAttributes: SetupInstanceAttributes,
  ) {
    this.geometry = geometry;
    this.material = material;
    this.cameraEntity = cameraEntity;
    this.floatsPerInstance = floatsPerInstance;
    this.bindInstanceData = bindInstanceData;
    this.setupInstanceAttributes = setupInstanceAttributes;
  }

  /**
   * Prepares for drawing by binding the material and geometry for rendering.
   *
   * This method binds the shader program (material) and sets up the Vertex Array Object (VAO)
   * for the geometry. After calling this method, the renderable is ready to be drawn.
   *
   * @param gl - The WebGL2 rendering context
   */
  public bind(gl: WebGL2RenderingContext): void {
    this.material.bind(gl);
    this.geometry.bind(gl, this.material.program);
  }
}
