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
import { matchesMask } from '../../utilities/matches-mask.js';
import {
  CameraEcsComponent,
  cameraId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { InstanceComponents, Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { RenderCommand } from '../render-command.js';

const setupInstanceAttributesAndDraw = (
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
) => {
  const { gl } = renderContext;

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);

  renderable.setupInstanceAttributes(gl, renderable);

  gl.enable(gl.BLEND); // TODO: Potential improvement - move blend state to material-specific configuration.
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // TODO: Potential improvement - centralize blend setup to avoid duplicate state calls.
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength); // TODO: Potential improvement - avoid hard-coded quad vertex count for non-quad sprites.
};

let instanceDataBuffer = new Float32Array(0);

const ensureInstanceDataBufferCapacity = (size: number): Float32Array => {
  if (instanceDataBuffer.length < size) {
    instanceDataBuffer = new Float32Array(size);
  }

  return instanceDataBuffer;
};

const includeBatch = (
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  batchStart: number,
  batchEnd: number,
) => {
  const { gl } = renderContext;
  const { renderable } = commands[batchStart]; // It is safe to assume all commands in the batch share the same renderable.
  const batchLength = batchEnd - batchStart;

  renderable.material.setUniform('u_projection', projectionMatrix);

  renderable.bind(gl);

  const requiredBatchSize = batchLength * renderable.floatsPerInstance;
  const buffer = ensureInstanceDataBufferCapacity(requiredBatchSize);

  let instanceDataOffset = 0;

  for (let i = batchStart; i < batchEnd; i++) {
    renderable.bindInstanceData(
      commands[i].components,
      buffer,
      instanceDataOffset,
    );

    instanceDataOffset += renderable.floatsPerInstance;
  }

  // Upload instance transform buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW, 0, requiredBatchSize);

  setupInstanceAttributesAndDraw(renderContext, renderable, batchLength);
};

const spriteEntityBuffer: number[] = [];
const renderCommands: RenderCommand[] = [];

/**
 * Creates a render system that batches and renders sprites based on the camera view.
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent], void, Matrix3x3> => ({
  query: [cameraId, positionId],
  beforeQuery: (world) =>
    world.queryEntities([spriteId, positionId], spriteEntityBuffer),
  run: (result, world) => {
    const [cameraComponent, positionComponent] = result.components;

    const projectionMatrix = createProjectionMatrix(
      renderContext.width,
      renderContext.height,
      positionComponent.world,
      cameraComponent.zoom,
    );

    renderCommands.length = 0;

    for (const spriteEntity of spriteEntityBuffer) {
      const spriteComponent = world.getComponent<SpriteEcsComponent>(
        spriteEntity,
        spriteId,
      )!;

      if (!spriteComponent.enabled) {
        continue;
      }

      const { renderable } = spriteComponent;

      const maskMatches = matchesMask(
        renderable.category,
        cameraComponent.cullingMask,
      );

      if (!maskMatches) {
        continue;
      }

      const entityPosition = world.getComponent<PositionEcsComponent>(
        spriteEntity,
        positionId,
      )!; // Position component is guaranteed to exist due to the query in beforeQuery.

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

      renderCommands.push({
        layer: 0,
        depth: entityPosition.world.y,
        renderable,
        components,
      });
    }

    return projectionMatrix;
  },
  afterRun: (projectionMatrix) => {
    renderCommands.sort((a, b) => {
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }

      return a.depth - b.depth;
    });

    let batchStart = 0;

    for (let i = 1; i <= renderCommands.length; i++) {
      const isBatchBoundary =
        i === renderCommands.length ||
        renderCommands[i].renderable !== renderCommands[batchStart].renderable;

      if (isBatchBoundary) {
        includeBatch(
          renderContext,
          projectionMatrix,
          renderCommands,
          batchStart,
          i,
        );
        batchStart = i;
      }
    }
  },
});
