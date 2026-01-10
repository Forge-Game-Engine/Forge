import { PositionEcsComponent, positionId } from '../../common/index.js';
import { Matrix3x3 } from '../../math/index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';
import { EcsWorld } from '../../new-ecs/index.js';
import { matchesLayerMask } from '../../utilities/matches-layer-mask.js';
import {
  CameraEcsComponent,
  cameraId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { InstanceBatch } from './instance-batch.js';

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

/**
 * Creates a render system that batches and renders sprites based on the camera view.
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
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
