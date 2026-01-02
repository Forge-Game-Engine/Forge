import { PositionComponent } from '../../common/index.js';
import { Entity, System } from '../../ecs/index.js';
import { CameraComponent } from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { InstanceBatch, RenderLayerComponent } from '../render-layers/index.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';

/**
 * A system responsible for rendering entities with render layers to the screen.
 *
 * The RenderSystem processes entities that have a {@link RenderLayerComponent} and renders
 * them using WebGL2. It handles:
 * - Sorting entities by render layer order
 * - Managing instance batching for efficient rendering
 * - Setting up projection matrices for cameras
 * - Managing scissor rectangles for viewport clipping
 * - Configuring WebGL state (blending, etc.)
 *
 * @example
 * ```ts
 * const renderContext = createRenderContext(canvas);
 * const renderSystem = new RenderSystem(renderContext);
 * world.addSystem(renderSystem);
 * ```
 */
export class RenderSystem extends System {
  private readonly _renderContext: RenderContext;

  /**
   * Creates a new RenderSystem instance.
   *
   * @param renderContext - The rendering context containing the WebGL context,
   *                        canvas, and other rendering resources.
   */
  constructor(renderContext: RenderContext) {
    super([RenderLayerComponent], 'renderer');

    this._renderContext = renderContext;

    this._setupGLState();
  }

  /**
   * Pre-processes entities before rendering.
   *
   * This method sorts entities by their render layer order (lower numbers are rendered first)
   * and clears the color buffer to prepare for rendering.
   *
   * @param entities - The entities with render layers to be sorted.
   * @returns The sorted array of entities.
   */
  public override beforeAll(entities: Entity[]): Entity[] {
    entities.sort((a, b) => {
      const orderA = a.getComponentRequired(RenderLayerComponent).order;
      const orderB = b.getComponentRequired(RenderLayerComponent).order;

      return orderA - orderB;
    });

    this._renderContext.gl.clear(this._renderContext.gl.COLOR_BUFFER_BIT);

    return entities;
  }

  /**
   * Renders all renderables in the entity's render layer.
   *
   * For each renderable in the layer, this method:
   * 1. Sets up the projection matrix based on the camera
   * 2. Binds the renderable's material and geometry
   * 3. Configures scissor testing if needed
   * 4. Batches instance data for all entities
   * 5. Uploads the data to the GPU and draws
   *
   * @param entity - The entity containing a {@link RenderLayerComponent}.
   */
  public run(entity: Entity): void {
    const layerComponent = entity.getComponentRequired(RenderLayerComponent);

    const { gl } = this._renderContext;

    for (const [renderable, batch] of layerComponent.renderLayer.renderables) {
      this._includeBatch(renderable, batch, gl);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Cleans up the render system when stopped.
   *
   * Clears the color buffer to reset the rendering state.
   * This is called when the system is stopped or removed from the world.
   */
  public override stop(): void {
    this._renderContext.gl.clear(this._renderContext.gl.COLOR_BUFFER_BIT);
  }

  /**
   * Configures the WebGL state for rendering.
   *
   * Sets up alpha blending to support transparent sprites and other
   * semi-transparent rendering. This is called once during system initialization.
   *
   * @private
   */
  private _setupGLState(): void {
    const { gl } = this._renderContext;

    gl.enable(gl.BLEND); // TODO: these might need to be material specific
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // TODO: these might need to be material specific
  }

  /**
   * Renders a batch of entities using instanced rendering.
   *
   * This method handles the complete rendering pipeline for a batch:
   * 1. Skips empty batches
   * 2. Calculates projection matrix from camera position and zoom
   * 3. Binds the renderable's material and geometry
   * 4. Sets up scissor testing if the camera has a scissor rect
   * 5. Allocates or grows the instance buffer as needed
   * 6. Fills the instance buffer with entity data
   * 7. Uploads to GPU and performs instanced draw call
   *
   * @param renderable - The renderable containing material, geometry, and camera.
   * @param batch - The instance batch containing entities to render.
   * @param gl - The WebGL2 rendering context.
   * @private
   */
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

  /**
   * Sets up instance attributes and performs the draw call.
   *
   * This method configures the vertex attribute pointers for instanced rendering
   * and executes the draw call to render all instances in the batch.
   *
   * @param gl - The WebGL2 rendering context.
   * @param renderable - The renderable containing setup information.
   * @param batchLength - The number of instances to draw.
   * @private
   */
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
