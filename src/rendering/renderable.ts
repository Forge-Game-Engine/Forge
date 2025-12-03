import { Entity } from '../ecs/entity.js';
import type { Geometry } from './geometry/index.js';
import type { Material } from './materials/index.js';

type BindInstanceDataCallback = (
  entity: Entity,
  bindSpriteInstanceData: Float32Array,
  offset: number,
) => void;

type SetupInstanceAttributes = (
  gl: WebGL2RenderingContext,
  renderable: Renderable,
) => void;

export class Renderable {
  public readonly geometry: Geometry;
  public readonly material: Material;
  public readonly floatsPerInstance: number;
  public readonly bindInstanceData: BindInstanceDataCallback;
  public readonly setupInstanceAttributes: SetupInstanceAttributes;

  constructor(
    geometry: Geometry,
    material: Material,
    floatsPerInstance: number,
    bindInstanceData: BindInstanceDataCallback,
    setupInstanceAttributes: SetupInstanceAttributes,
  ) {
    this.geometry = geometry;
    this.material = material;
    this.floatsPerInstance = floatsPerInstance;
    this.bindInstanceData = bindInstanceData;
    this.setupInstanceAttributes = setupInstanceAttributes;
  }

  /**
   * Prepares for drawing: binds material and geometry (including VAO). Also binds instance data.
   */
  public bind(gl: WebGL2RenderingContext): void {
    this.material.bind(gl);
    this.geometry.bind(gl, this.material.program);
  }
}
