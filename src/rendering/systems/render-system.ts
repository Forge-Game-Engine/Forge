import {
  PositionComponent,
  PositionComponentName,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { Entity, System } from '../../ecs/index.js';
import { Matrix3x3 } from '../../math/index.js';
import { Vector2 } from '../../math/vector2.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';
import { EcsWorld, QueryResult } from '../../new-ecs/index.js';
import { matchesLayerMask } from '../../utilities/matches-layer-mask.js';
import {
  CameraComponent,
  CameraComponentName,
  CameraEcsComponent,
  cameraId,
  SpriteComponentName,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { RenderContext } from '../render-context.js';
import {
  InstanceBatch,
  RenderLayerComponent,
  RenderLayerComponentName,
  RenderLayerEcsComponent,
} from '../render-layers/index.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';

/**
 * A system responsible for rendering entities with render layers to the screen.
 */
export class RenderSystem extends System {
  private readonly _renderContext: RenderContext;

  /**
   * Creates a new RenderSystem instance.
   *
   * @param renderContext - The rendering context.
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

const setupInstanceAttributesAndDraw = (
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
) => {
  const { gl } = renderContext;

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);

  renderable.setupInstanceAttributes(gl, renderable);

  gl.enable(gl.BLEND); // TODO: these might need to be material specific
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // TODO: these might need to be material specific & is already called in _setupGLState
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength); // TODO: still assumes a quad for sprites
};

const includeBatch = (
  renderable: Renderable,
  batch: InstanceBatch,
  renderContext: RenderContext,
  world: EcsWorld,
  projectionMatrix: Matrix3x3,
) => {
  const { entities } = batch;
  const { gl } = renderContext;

  if (entities.length === 0) {
    return;
  }

  renderable.material.setUniform('u_projection', projectionMatrix);

  renderable.bind(gl);

  // if (camera.scissorRect) {
  //   gl.enable(gl.SCISSOR_TEST);
  //   gl.scissor(
  //     Math.floor(camera.scissorRect.origin.x * gl.canvas.width),
  //     Math.floor(camera.scissorRect.origin.y * gl.canvas.height),
  //     Math.floor(camera.scissorRect.size.x * gl.canvas.width),
  //     Math.floor(camera.scissorRect.size.y * gl.canvas.height),
  //   );
  // }

  const requiredBatchSize = entities.length * renderable.floatsPerInstance;

  if (!batch.buffer || batch.buffer.length < requiredBatchSize) {
    batch.buffer = new Float32Array(
      requiredBatchSize * batch.bufferGrowthFactor,
    );
  }

  let instanceDataOffset = 0;

  for (const entity of entities) {
    renderable.bindInstanceData(
      entity,
      world,
      batch.buffer,
      instanceDataOffset,
    );

    instanceDataOffset += renderable.floatsPerInstance;
  }

  // Upload instance transform buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.buffer, gl.DYNAMIC_DRAW);

  setupInstanceAttributesAndDraw(renderContext, renderable, entities.length);
};

const spriteEntityBuffer: number[] = [];
const renderables: Map<Renderable, InstanceBatch> = new Map();

export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  beforeQuery: (world) => world.queryEntities([spriteId], spriteEntityBuffer),
  run: (result, world) => {
    const [cameraComponent, positionComponent] = result.components;

    const { gl } = renderContext;

    const projectionMatrix = createProjectionMatrix(
      gl.canvas.width,
      gl.canvas.height,
      positionComponent.world,
      cameraComponent.zoom,
    );

    for (const batch of renderables.values()) {
      batch.entities.length = 0;
    }

    for (const spriteEntity of spriteEntityBuffer) {
      const spriteComponent = world.getComponent<SpriteEcsComponent>(
        spriteEntity,
        spriteId,
      )!;

      if (!spriteComponent.enabled) {
        continue;
      }

      const { renderable } = spriteComponent.sprite;

      const layerMaskMatches = matchesLayerMask(
        renderable.layer,
        cameraComponent.layerMask,
      );

      if (!layerMaskMatches) {
        continue;
      }

      if (!renderables.has(renderable)) {
        renderables.set(renderable, new InstanceBatch());
      }

      const batch = renderables.get(renderable)!;

      batch.entities.push(spriteEntity);
    }

    for (const [renderable, batch] of renderables) {
      includeBatch(renderable, batch, renderContext, world, projectionMatrix);
    }

    gl.bindVertexArray(null);
  },
});
