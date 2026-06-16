import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3 } from '../../math/index.js';
import { RenderContext } from '../../rendering/render-context.js';
import { Renderable } from '../../rendering/renderable.js';
import { InstanceBatch } from '../../rendering/systems/instance-batch.js';
import {
  UiCanvasEcsComponent,
  uiCanvasId,
} from '../components/ui-canvas-component.js';
import { UiInstanceComponents } from '../components/ui-instance-components.js';
import {
  UiRenderableEcsComponent,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';
import { createUiProjectionMatrix } from '../utilities/create-ui-projection-matrix.js';

const uiEntityBuffer: number[] = [];
const renderables: Map<
  Renderable<UiInstanceComponents>,
  InstanceBatch<UiInstanceComponents>
> = new Map();

/**
 * Batches all visible UI entities sharing the same `Renderable` and submits
 * them as a single instanced draw call, then clears the batch for the next
 * group.
 */
const flushBatch = (
  renderable: Renderable<UiInstanceComponents>,
  batch: InstanceBatch<UiInstanceComponents>,
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
): void => {
  const { entries } = batch;
  const { gl } = renderContext;

  if (entries.length === 0) {
    return;
  }

  renderable.material.setUniform('u_projection', projectionMatrix);
  renderable.bind(gl);

  const requiredSize = entries.length * renderable.floatsPerInstance;

  if (batch.buffer.length < requiredSize) {
    batch.buffer = new Float32Array(requiredSize * batch.bufferGrowthFactor);
  }

  let dataOffset = 0;

  for (const components of entries) {
    renderable.bindInstanceData(components, batch.buffer, dataOffset);
    dataOffset += renderable.floatsPerInstance;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.buffer, gl.DYNAMIC_DRAW);

  renderable.setupInstanceAttributes(gl, renderable);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, entries.length);

  entries.length = 0;
};

const getUiEntityZIndex = (world: EcsWorld, entityId: number): number => {
  const r = world.getComponent<UiRenderableEcsComponent>(
    entityId,
    uiRenderableId,
  );

  return r?.zIndex ?? 0;
};

const flushIfRenderableChanged = (
  current: Renderable<UiInstanceComponents> | null,
  next: Renderable<UiInstanceComponents>,
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
): void => {
  if (current === null || current === next) {
    return;
  }

  const batch = renderables.get(current);

  if (batch) {
    flushBatch(current, batch, renderContext, projectionMatrix);
  }
};

/**
 * Creates the UI render ECS system.
 *
 * The system:
 * - Queries canvas entities (runs once per canvas each frame).
 * - Collects all UI renderable entities in `beforeQuery`.
 * - Sorts entities by `zIndex` (ascending = further back).
 * - Groups consecutive entities with the same `Renderable` into instanced
 *   draw calls.  Keep `zIndex` coarse (per layer/window) to preserve batching.
 *
 * Register with `SystemRegistrationOrder.late` to ensure UI draws after the
 * game render pass.
 *
 * @param renderContext - The WebGL render context.
 * @returns The UI render ECS system.
 */
export const createUiRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[UiCanvasEcsComponent], void> => ({
  query: [uiCanvasId],

  beforeQuery: (world: EcsWorld) => {
    world.queryEntities([uiRenderableId, uiTransformId], uiEntityBuffer);
  },

  run: (_result, world) => {
    const { gl } = renderContext;

    const projectionMatrix = createUiProjectionMatrix(
      gl.canvas.width,
      gl.canvas.height,
    );

    uiEntityBuffer.sort(
      (a, b) => getUiEntityZIndex(world, a) - getUiEntityZIndex(world, b),
    );

    for (const batch of renderables.values()) {
      batch.entries.length = 0;
    }

    let currentRenderable: Renderable<UiInstanceComponents> | null = null;

    for (const entityId of uiEntityBuffer) {
      const uiRenderable = world.getComponent<UiRenderableEcsComponent>(
        entityId,
        uiRenderableId,
      );

      if (!uiRenderable?.enabled) {
        continue;
      }

      const transform = world.getComponent<UiTransformEcsComponent>(
        entityId,
        uiTransformId,
      );

      if (!transform) {
        continue;
      }

      const { renderable } = uiRenderable;

      flushIfRenderableChanged(
        currentRenderable,
        renderable,
        renderContext,
        projectionMatrix,
      );

      currentRenderable = renderable;

      let batch = renderables.get(renderable);

      if (!batch) {
        batch = new InstanceBatch<UiInstanceComponents>();
        renderables.set(renderable, batch);
      }

      batch.entries.push({ transform, uiRenderable });
    }

    if (currentRenderable !== null) {
      const lastBatch = renderables.get(currentRenderable);

      if (lastBatch) {
        flushBatch(
          currentRenderable,
          lastBatch,
          renderContext,
          projectionMatrix,
        );
      }
    }

    gl.bindVertexArray(null);
  },
});
