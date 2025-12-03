import { Entity, System } from '../../ecs/index.js';
import { Batch, RenderableBatchComponent } from '../components/index.js';
import type { ForgeRenderLayer } from '../render-layers/index.js';
import { Renderable } from '../renderable.js';
import { BATCH_GROWTH_FACTOR } from './render-constants.js';

export interface RenderSystemOptions {
  layer: ForgeRenderLayer;
}

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

    const requiredBatchSize = entities.length * renderable.floatsPerInstance;

    if (!batch.instanceData || batch.instanceData.length < requiredBatchSize) {
      batch.instanceData = new Float32Array(
        requiredBatchSize * BATCH_GROWTH_FACTOR,
      );
    }

    for (let i = 0; i < entities.length; i++) {
      const batchedEntity = entities[i];
      const instanceDataOffset = i * renderable.floatsPerInstance;

      renderable.bindInstanceData(
        batchedEntity,
        batch.instanceData,
        instanceDataOffset,
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuffer);

    renderable.setupInstanceAttributes(gl, renderable);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength); // still assumes a quad for sprites
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}
