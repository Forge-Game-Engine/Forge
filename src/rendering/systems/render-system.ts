import { PositionComponent } from '../../common/index.js';
import { Entity, System } from '../../ecs/index.js';
import { CameraComponent } from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { InstanceBatch, RenderLayerComponent } from '../render-layers/index.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';

export class RenderSystem extends System {
  private readonly _renderContext: RenderContext;

  constructor(renderContext: RenderContext) {
    super([RenderLayerComponent], 'renderer');

    this._renderContext = renderContext;

    this._setupGLState();
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    entities.sort((a, b) => {
      const orderA = a.getComponentRequired(RenderLayerComponent).order;
      const orderB = b.getComponentRequired(RenderLayerComponent).order;

      return orderA - orderB;
    });

    this._renderContext.gl.clear(this._renderContext.gl.COLOR_BUFFER_BIT);

    return entities;
  }

  public run(entity: Entity): void {
    const layerComponent = entity.getComponentRequired(RenderLayerComponent);

    const { gl } = this._renderContext;

    for (const [renderable, batch] of layerComponent.renderLayer.renderables) {
      this._includeBatch(renderable, batch, gl);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Called once at system stop to clear.
   */
  public override stop(): void {
    this._renderContext.gl.clear(this._renderContext.gl.COLOR_BUFFER_BIT);
  }

  private _setupGLState(): void {
    const { gl } = this._renderContext;

    gl.enable(gl.BLEND); // TODO: these might need to be material specific
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // TODO: these might need to be material specific
  }

  private _includeBatch(
    renderable: Renderable,
    batch: InstanceBatch,
    gl: WebGL2RenderingContext,
  ): void {
    const { entities } = batch;

    if (entities.size === 0) {
      return;
    }

    const { cameraEntity } = renderable;

    const cameraPosition = cameraEntity.getComponentRequired(PositionComponent);

    const camera = cameraEntity.getComponentRequired(CameraComponent);

    const projectionMatrix = createProjectionMatrix(
      gl.canvas.width,
      gl.canvas.height,
      cameraPosition.world,
      camera.zoom,
    );

    renderable.material.setUniform('u_projection', projectionMatrix);

    renderable.bind(gl);

    if (camera.scissorRect) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        Math.floor(camera.scissorRect.origin.x * gl.canvas.width),
        Math.floor(camera.scissorRect.origin.y * gl.canvas.height),
        Math.floor(camera.scissorRect.size.x * gl.canvas.width),
        Math.floor(camera.scissorRect.size.y * gl.canvas.height),
      );
    }

    const requiredBatchSize = entities.size * renderable.floatsPerInstance;

    if (!batch.buffer || batch.buffer.length < requiredBatchSize) {
      batch.buffer = new Float32Array(
        requiredBatchSize * batch.bufferGrowthFactor,
      );
    }

    let instanceDataOffset = 0;

    for (const entity of entities) {
      renderable.bindInstanceData(entity, batch.buffer, instanceDataOffset);

      instanceDataOffset += renderable.floatsPerInstance;
    }

    // Upload instance transform buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._renderContext.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.buffer, gl.DYNAMIC_DRAW);

    this._setupInstanceAttributesAndDraw(gl, renderable, entities.size);
  }

  private _setupInstanceAttributesAndDraw(
    gl: WebGL2RenderingContext,
    renderable: Renderable,
    batchLength: number,
  ) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._renderContext.instanceBuffer);

    renderable.setupInstanceAttributes(gl, renderable);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength); // TODO: still assumes a quad for sprites
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // TODO: these might need to be material specific & is already called in _setupGLState
  }
}
