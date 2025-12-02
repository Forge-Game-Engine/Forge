import { Entity, System } from '../../ecs/index.js';
import { Batch, RenderableBatchComponent } from '../components/index.js';
import type { ForgeRenderLayer } from '../render-layers/index.js';
import { Renderable } from '../renderable.js';
import { BATCH_GROWTH_FACTOR } from './render-constants.js';

export interface RenderSystemOptions {
  layer: ForgeRenderLayer;
}

/**
 * A generic render system that supports different types of renderables via the InstanceDataPopulator abstraction.
 * Each renderable can define its own instance data layout and attribute configuration through its
 * instanceDataPopulator property, allowing for different shaders and rendering strategies.
 */
export class RenderSystem extends System {
  private readonly _layer: ForgeRenderLayer;
  private readonly _instanceBuffer: WebGLBuffer;

  constructor(options: RenderSystemOptions) {
    super(`${options.layer.name}-renderer`, [RenderableBatchComponent.symbol]);

    const { layer } = options;
    this._layer = layer;

    this._instanceBuffer = layer.context.createBuffer();
    this._setupGLState();
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    this._layer.context.clear(this._layer.context.COLOR_BUFFER_BIT);

    return entities;
  }

  public run(entity: Entity): void {
    const batchComponent =
      entity.getComponentRequired<RenderableBatchComponent>(
        RenderableBatchComponent.symbol,
      );

    if (batchComponent.renderLayer !== this._layer) {
      return;
    }

    const gl = this._layer.context;

    for (const [renderable, batch] of batchComponent.batches) {
      this._includeBatch(renderable, batch, gl);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Called once at system stop to clear.
   */
  public override stop(): void {
    this._layer.context.clear(this._layer.context.COLOR_BUFFER_BIT);
  }

  private _setupGLState(): void {
    const gl = this._layer.context;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private _includeBatch(
    renderable: Renderable,
    batch: Batch,
    gl: WebGL2RenderingContext,
  ): void {
    const { entities } = batch;

    if (entities.length === 0) {
      return;
    }

    renderable.bind(gl);

    const { instanceDataPopulator } = renderable;
    const { floatsPerInstance } = instanceDataPopulator;

    const requiredBatchSize = entities.length * floatsPerInstance;

    if (!batch.instanceData || batch.instanceData.length < requiredBatchSize) {
      batch.instanceData = new Float32Array(
        requiredBatchSize * BATCH_GROWTH_FACTOR,
      );
    }

    for (let i = 0; i < entities.length; i++) {
      const batchedEntity = entities[i];
      const instanceDataOffset = i * floatsPerInstance;

      instanceDataPopulator.populateInstanceData(
        batch.instanceData,
        instanceDataOffset,
        batchedEntity,
      );
    }

    // Upload instance transform buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.instanceData, gl.DYNAMIC_DRAW);

    this._setupInstanceAttributesAndDraw(gl, renderable, entities.length);
  }

  private _setupInstanceAttributesAndDraw(
    gl: WebGL2RenderingContext,
    renderable: Renderable,
    batchLength: number,
  ) {
    const { instanceDataPopulator } = renderable;
    const { floatsPerInstance, attributeSpecs } = instanceDataPopulator;
    const program = renderable.material.program;

    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);

    // Set up instance attributes based on the populator's attribute specs
    for (const spec of attributeSpecs) {
      const location = gl.getAttribLocation(program, spec.name);
      this._setupInstanceAttributes(
        location,
        gl,
        spec.numComponents,
        spec.offset,
        floatsPerInstance,
      );
    }

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private _setupInstanceAttributes(
    attributeLocation: number,
    gl: WebGL2RenderingContext,
    numComponents: number,
    index: number,
    floatsPerInstance: number,
  ) {
    if (attributeLocation === -1) {
      return;
    }

    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(
      attributeLocation,
      numComponents,
      gl.FLOAT,
      false,
      floatsPerInstance * 4,
      index * 4,
    );
    gl.vertexAttribDivisor(attributeLocation, 1);
  }
}
