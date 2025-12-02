import type { Geometry } from './geometry/index.js';
import type { Material } from './materials/index.js';
import type { InstanceDataPopulator } from './systems/instance-data-populator.js';
import { defaultSpriteInstanceDataPopulator } from './systems/sprite-instance-data-populator.js';

export interface RenderableOptions {
  geometry: Geometry;
  material: Material;
  /**
   * The instance data populator to use for this renderable.
   * If not provided, the default sprite instance data populator will be used.
   */
  instanceDataPopulator?: InstanceDataPopulator;
}

export class Renderable {
  public geometry: Geometry;
  public material: Material;
  public instanceDataPopulator: InstanceDataPopulator;

  constructor(geometry: Geometry, material: Material);
  constructor(options: RenderableOptions);
  constructor(
    geometryOrOptions: Geometry | RenderableOptions,
    material?: Material,
  ) {
    if ('geometry' in geometryOrOptions && 'material' in geometryOrOptions) {
      // Options object constructor
      this.geometry = geometryOrOptions.geometry;
      this.material = geometryOrOptions.material;
      this.instanceDataPopulator =
        geometryOrOptions.instanceDataPopulator ??
        defaultSpriteInstanceDataPopulator;
    } else {
      // Legacy constructor for backwards compatibility
      this.geometry = geometryOrOptions;
      this.material = material!;
      this.instanceDataPopulator = defaultSpriteInstanceDataPopulator;
    }
  }

  /**
   * Prepares for drawing: binds material and geometry (including VAO).
   * The RenderSystem is still responsible for binding instance data & calling draw.
   */
  public bind(gl: WebGL2RenderingContext): void {
    this.material.bind(gl);
    this.geometry.bind(gl, this.material.program);
  }
}
