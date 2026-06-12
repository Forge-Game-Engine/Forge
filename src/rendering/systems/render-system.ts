import {
  FlipEcsComponent,
  flipId,
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
} from '../../common/index.js';
import { Matrix3x3 } from '../../math/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { matchesLayerMask } from '../../utilities/matches-layer-mask.js';
import {
  CameraEcsComponent,
  cameraId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { InstanceComponents, Renderable } from '../renderable.js';
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

  gl.enable(gl.BLEND); // Potential improvement: move blend state to material-specific configuration.
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Potential improvement: centralize blend setup to avoid duplicate state calls.
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength); // Potential improvement: avoid hard-coded quad vertex count for non-quad sprites.
};

const includeBatch = (
  renderable: Renderable,
  batch: InstanceBatch,
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
) => {
  const { entries } = batch;
  const { gl } = renderContext;

  if (entries.length === 0) {
    return;
  }

  renderable.material.setUniform('u_projection', projectionMatrix);

  renderable.bind(gl);

  const requiredBatchSize = entries.length * renderable.floatsPerInstance;

  if (!batch.buffer || batch.buffer.length < requiredBatchSize) {
    batch.buffer = new Float32Array(
      requiredBatchSize * batch.bufferGrowthFactor,
    );
  }

  let instanceDataOffset = 0;

  for (const components of entries) {
    renderable.bindInstanceData(components, batch.buffer, instanceDataOffset);

    instanceDataOffset += renderable.floatsPerInstance;
  }

  // Upload instance transform buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.buffer, gl.DYNAMIC_DRAW);

  setupInstanceAttributesAndDraw(renderContext, renderable, entries.length);
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
): EcsSystem<[CameraEcsComponent, PositionEcsComponent], void> => ({
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
      batch.entries.length = 0;
    }

    for (const spriteEntity of spriteEntityBuffer) {
      const spriteComponent = world.getComponent<SpriteEcsComponent>(
        spriteEntity,
        spriteId,
      )!;

      if (!spriteComponent.enabled) {
        continue;
      }

      const { renderable } = spriteComponent;

      const layerMaskMatches = matchesLayerMask(
        renderable.layer,
        cameraComponent.layerMask,
      );

      if (!layerMaskMatches) {
        continue;
      }

      let batch = renderables.get(renderable);

      if (!batch) {
        batch = new InstanceBatch();
        renderables.set(renderable, batch);
      }

      const entityPosition = world.getComponent<PositionEcsComponent>(
        spriteEntity,
        positionId,
      );

      if (!entityPosition) {
        throw new Error(
          `Entity "${spriteEntity}" has a sprite component but no position component.`,
        );
      }

      const components: InstanceComponents = {
        position: entityPosition,
        rotation: world.getComponent<RotationEcsComponent>(
          spriteEntity,
          rotationId,
        ),
        scale: world.getComponent<ScaleEcsComponent>(spriteEntity, scaleId),
        sprite: spriteComponent,
        flip: world.getComponent<FlipEcsComponent>(spriteEntity, flipId),
      };

      batch.entries.push(components);
    }

    for (const [renderable, batch] of renderables) {
      includeBatch(renderable, batch, renderContext, projectionMatrix);
    }

    gl.bindVertexArray(null);
  },
});
