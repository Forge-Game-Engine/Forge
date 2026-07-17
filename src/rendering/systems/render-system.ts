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
import { RenderTarget } from '../render-target.js';
import { InstanceComponents, Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { RenderCommand } from '../render-command.js';
import { computeNineSliceInstances } from '../utilities/nine-slice.js';

/**
 * The result of a single camera's `run` pass. `afterRun` receives one of
 * these per camera, once every camera has run, and uses it to bind the
 * correct draw destination before issuing that camera's batched draw calls.
 */
export interface RenderPassResult {
  /** The camera's projection matrix, applied to every draw call in this pass. */
  projectionMatrix: Matrix3x3;

  /** The render target to draw into, or `null` to draw onto the canvas. */
  target: RenderTarget | null;

  /** This camera's sprite draw commands, gathered by `run`. */
  commands: RenderCommand[];
}

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

/**
 * One `RenderCommand[]` per camera visited this tick, indexed by that
 * camera's position in query order (reset via `cameraIndex`, not by
 * identity), and reused across ticks so a stable number of cameras never
 * reallocates. `run` can't share a single buffer across cameras the way a
 * once-per-entity hook could, since every camera's commands need to survive
 * until `afterRun` draws all of them together.
 */
const commandBuffersByCameraIndex: RenderCommand[][] = [];
let cameraIndex = 0;

/**
 * Tracks which destinations (a `RenderTarget`, or `null` for the canvas)
 * have already been cleared this frame, so multiple cameras that share a
 * destination (for example a static background camera and a foreground
 * camera both drawing onto the canvas, or both into the same off-screen
 * `RenderTarget` for later post-processing) composite onto one another
 * instead of each camera's clear wiping out the previous camera's draw.
 */
const clearedDestinationsThisFrame = new Set<RenderTarget | null>();

/**
 * Creates a render system that batches and renders sprites based on the camera view.
 *
 * Each camera draws into its own `CameraEcsComponent.renderTarget`, or
 * directly onto the canvas if it doesn't have one, clearing that
 * destination first (according to `RenderContext.clearStrategy`) the first
 * time it's used each frame. Cameras that share a destination (either the
 * canvas or the same `RenderTarget`) draw on top of one another rather than
 * each clearing what the last one drew.
 *
 * `run` gathers each camera's sprite commands and projection matrix without
 * drawing anything; `afterRun` does the actual drawing, once every camera
 * has run, so every camera's batches are issued from a single, predictable
 * pass over the whole tick's results.
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<
  [CameraEcsComponent, PositionEcsComponent],
  void,
  RenderPassResult
> => ({
  query: [cameraId, positionId],
  beforeQuery: (world) => {
    clearedDestinationsThisFrame.clear();
    world.queryEntities([spriteId, positionId], spriteEntityBuffer);
    cameraIndex = 0;
  },
  run: (result, world) => {
    const [cameraComponent, positionComponent] = result.components;

    const projectionMatrix = createProjectionMatrix(
      renderContext.width,
      renderContext.height,
      positionComponent.world,
      cameraComponent.zoom,
    );

    let commands = commandBuffersByCameraIndex[cameraIndex];

    if (!commands) {
      commands = [];
      commandBuffersByCameraIndex[cameraIndex] = commands;
    }

    commands.length = 0;
    cameraIndex += 1;

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

      // A nine-sliced sprite renders as several sub-quads (up to nine), each
      // pushed as its own command so it flows through the existing
      // one-command-per-instance batching unchanged: the sub-quads share the
      // sprite's renderable, layer and depth, so they stay batched and sorted
      // together, and differ only in the per-slice size, pivot and texture
      // region carried on `sliceInstance`.
      if (spriteComponent.slices && spriteComponent.textureDimensions) {
        const sliceInstances = computeNineSliceInstances({
          width: spriteComponent.width,
          height: spriteComponent.height,
          textureWidth: spriteComponent.textureDimensions.x,
          textureHeight: spriteComponent.textureDimensions.y,
          insets: spriteComponent.slices,
          pivot: spriteComponent.pivot,
          uvOffset: spriteComponent.uvOffset,
          uvScale: spriteComponent.uvScale,
        });

        for (const sliceInstance of sliceInstances) {
          commands.push({
            layer: spriteComponent.layer,
            depth: entityPosition.world.y,
            renderable,
            components: { ...components, sliceInstance },
          });
        }

        continue;
      }

      commands.push({
        layer: spriteComponent.layer,
        depth: entityPosition.world.y,
        renderable,
        components,
      });
    }

    return {
      projectionMatrix,
      target: cameraComponent.renderTarget ?? null,
      commands,
    };
  },
  afterRun: (results) => {
    for (const { projectionMatrix, target, commands } of results) {
      renderContext.bindRenderTarget(target);

      if (!clearedDestinationsThisFrame.has(target)) {
        renderContext.clear();
        clearedDestinationsThisFrame.add(target);
      }

      commands.sort((a, b) => {
        if (a.layer !== b.layer) {
          return a.layer - b.layer;
        }

        return a.depth - b.depth;
      });

      let batchStart = 0;

      for (let i = 1; i <= commands.length; i++) {
        const isBatchBoundary =
          i === commands.length ||
          commands[i].renderable !== commands[batchStart].renderable;

        if (isBatchBoundary) {
          includeBatch(
            renderContext,
            projectionMatrix,
            commands,
            batchStart,
            i,
          );
          batchStart = i;
        }
      }
    }

    // Sprite drawing leaves blending enabled as global GL state (see
    // `setupInstanceAttributesAndDraw`). Reset it once every camera's
    // batches are drawn, so later systems (post-processing, presenting)
    // start from a known, disabled baseline instead of having to assume it
    // was left on.
    renderContext.gl.disable(renderContext.gl.BLEND);
  },
});
