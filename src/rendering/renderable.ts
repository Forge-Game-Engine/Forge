import type {
  FlipEcsComponent,
  PositionEcsComponent,
  RotationEcsComponent,
  ScaleEcsComponent,
} from '../common/index.js';
import type { Vector2 } from '../math/index.js';
import type { SpriteEcsComponent } from './components/index.js';
import type { Color } from './color.js';
import type { Material } from './materials/material.js';
import type { RenderCommand } from './render-command.js';

/**
 * Per-glyph outline/soft-shadow parameters, bound by
 * `textEffectsInstanceDataSegment`.
 * Populated only for glyph instances pushed by `pushTextRenderCommands` -
 * `InstanceComponents.textEffects` is `undefined` for ordinary sprites.
 */
export interface TextEffectsInstanceData {
  /** Outline color; see `TextEcsComponent.outlineColor`. */
  outlineColor: Color;

  /** Outline thickness, in screen-pixel-range units; see `TextEcsComponent.outlineWidth`. */
  outlineWidth: number;

  /** Soft shadow/glow color; see `TextEcsComponent.shadowColor`. */
  shadowColor: Color;

  /** Soft shadow/glow offset, in screen-pixel-range units; see `TextEcsComponent.shadowOffset`. */
  shadowOffset: Vector2;

  /** Soft shadow/glow fade radius, in screen-pixel-range units; see `TextEcsComponent.shadowSoftness`. */
  shadowSoftness: number;
}

/**
 * The components needed to bind an entity's per-instance data, resolved once
 * per entity by the render system and passed to `BindInstanceDataCallback` so
 * that instance data segments don't each have to look them up again.
 */
export interface InstanceComponents {
  /**
   * The entity's position.
   */
  position: PositionEcsComponent;

  /**
   * The entity's rotation, if it has one.
   */
  rotation: RotationEcsComponent | null;

  /**
   * The entity's scale, if it has one.
   */
  scale: ScaleEcsComponent | null;

  /**
   * The entity's sprite data.
   */
  sprite: SpriteEcsComponent;

  /**
   * The entity's flip flags, if it has any.
   */
  flip: FlipEcsComponent | null;

  /**
   * The entity's text outline/shadow effect data, if this instance is a
   * glyph quad pushed by `pushTextRenderCommands`. `undefined` for ordinary
   * sprites.
   */
  textEffects?: TextEffectsInstanceData;

  /**
   * The glyph's faux-bold edge shift (`GlyphQuad.embolden`), if this
   * instance is a glyph quad pushed by `pushTextRenderCommands`.
   * `undefined` for ordinary sprites.
   */
  textEmbolden?: number;
}

/**
 * Callback function type for binding instance data to a buffer.
 * This function is responsible for writing per-instance data (e.g., transforms, colors) into a Float32Array.
 *
 * @param components - The entity's components, resolved once per entity by the render system
 * @param instanceDataBuffer - The Float32Array buffer to write instance data into
 * @param offset - The offset within the buffer where this instance's data should start
 */
export type BindInstanceDataCallback = (
  components: InstanceComponents,
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
export type SetupInstanceAttributesCallback = (
  gl: WebGL2RenderingContext,
  renderable: Renderable,
) => void;

/**
 * Binds a batch's material for drawing the batch's commands: uploads the
 * per-batch values (the batch's texture) and uses the material's program.
 *
 * @param gl - The WebGL2 rendering context
 * @param command - The batch's first command; every command in a batch has
 * the same renderable, texture and emissive texture
 */
export type BindBatchCallback = (
  gl: WebGL2RenderingContext,
  command: RenderCommand,
) => void;

/**
 * How the render system draws one kind of instanced quad: the material, the
 * per-instance data layout its vertex shader reads, and how a batch's
 * textures are bound. Internal to the render system, which creates one per
 * sprite material and one per text pass; not part of the public API.
 */
export class Renderable {
  /**
   * The material (shaders and uniforms) to draw with.
   */
  public readonly material: Material;

  /**
   * The number of float values required per instance in the instance data buffer.
   * This determines how much data needs to be provided for each entity being rendered.
   */
  public readonly floatsPerInstance: number;

  /**
   * Callback function that binds instance-specific data for an entity into a buffer.
   * Called for each entity to prepare its data for instanced rendering.
   */
  public readonly bindInstanceData: BindInstanceDataCallback;

  /**
   * Callback function that sets up WebGL vertex attribute pointers for instanced rendering.
   * Called to configure how instance data should be interpreted by the shader.
   */
  public readonly setupInstanceAttributes: SetupInstanceAttributesCallback;

  /**
   * Binds the material for a batch, with the batch's textures.
   */
  public readonly bindBatch: BindBatchCallback;

  /**
   * Creates a new Renderable.
   *
   * @param material - The material to draw with
   * @param floatsPerInstance - The number of floats per instance in the instance buffer
   * @param bindInstanceData - Callback to bind instance data for each entity
   * @param setupInstanceAttributes - Callback to setup instance attributes in WebGL
   * @param bindBatch - Callback to bind the material for a batch
   */
  constructor(
    material: Material,
    floatsPerInstance: number,
    bindInstanceData: BindInstanceDataCallback,
    setupInstanceAttributes: SetupInstanceAttributesCallback,
    bindBatch: BindBatchCallback,
  ) {
    this.material = material;
    this.floatsPerInstance = floatsPerInstance;
    this.bindInstanceData = bindInstanceData;
    this.setupInstanceAttributes = setupInstanceAttributes;
    this.bindBatch = bindBatch;
  }
}
