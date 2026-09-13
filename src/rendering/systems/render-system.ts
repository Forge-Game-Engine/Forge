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
import { Matrix3x3, Vec2 } from '../../math/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import {
  TextEcsComponent,
  textId,
} from '../../text/components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/components/text-mesh-component.js';
import { buildTextCameraCommands } from '../../text/rendering/glyph-quad.js';
import {
  CameraEcsComponent,
  cameraId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { RenderCommand } from '../render-command.js';
import { calculatePixelsPerUnit } from '../utilities/calculate-pixels-per-unit.js';
import { computeNineSliceRegions } from '../utilities/compute-nine-slice-regions.js';
import { EcsWorld } from '../../ecs/index.js';

const setupInstanceAttributesAndDraw = (
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
) => {
  const { gl } = renderContext;

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  renderable.setupInstanceAttributes(gl, renderable);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batchLength);
};

let instanceDataBuffer = new Float32Array(0);

const ensureInstanceDataBufferCapacity = (size: number): Float32Array => {
  if (instanceDataBuffer.length < size) {
    instanceDataBuffer = new Float32Array(size);
  }

  return instanceDataBuffer;
};

// Per-layer bucket resolution for `computeDrawOrder`'s counting sort, and a
// hard cap on total buckets (bucketsPerLayer * distinct layer count) so a
// scene with pathologically many distinct layers can't blow up memory -
// see `computeDrawOrder`.
const DEFAULT_DEPTH_BUCKETS_PER_LAYER = 4096;
const MAX_TOTAL_DEPTH_BUCKETS = 1 << 20;

let drawOrderBuffer: Uint32Array<ArrayBufferLike> = new Uint32Array(0);
let bucketKeysBuffer: Uint32Array<ArrayBufferLike> = new Uint32Array(0);
let bucketOffsetsBuffer: Uint32Array<ArrayBufferLike> = new Uint32Array(0);

const ensureUint32Capacity = (
  buffer: Uint32Array<ArrayBufferLike>,
  size: number,
): Uint32Array<ArrayBufferLike> =>
  buffer.length < size ? new Uint32Array(size) : buffer;

const quantizeDepthToBucket = (
  depth: number,
  minDepth: number,
  depthRange: number,
  depthBucketsPerLayer: number,
): number => {
  const normalizedDepth = (depth - minDepth) / depthRange;

  if (normalizedDepth <= 0) {
    return 0;
  }

  if (normalizedDepth >= 1) {
    return depthBucketsPerLayer - 1;
  }

  return (normalizedDepth * depthBucketsPerLayer) | 0;
};

/**
 * Computes a draw order for `commands` - indices into `commands`, ascending
 * by layer then depth - with a counting sort instead of a general-purpose
 * comparison sort.
 *
 * `Array.prototype.sort` with a comparator costs grow sharply with sprite
 * count for two independent reasons: it's O(n log n), and every comparison
 * has to dereference a full `RenderCommand` object to read `layer`/`depth`.
 * A counting sort buckets each command by a `(layer, quantized depth)` key
 * in one linear pass instead, which is both algorithmically cheaper (O(n))
 * and touches each command object only once. Depth is quantized per-frame,
 * relative to the actual depth range present in `commands`, into
 * `depthBucketsPerLayer` buckets - fine enough that any visually meaningful
 * depth difference lands in a different bucket for any reasonably sized
 * scene, while sidestepping the floating-point-equality comparisons a
 * comparison sort would otherwise make on every call. Commands are stable
 * within a bucket (original relative order preserved), matching
 * `Array.prototype.sort`'s own stability guarantee.
 * @param commands - The commands to order. Not reordered in place - the
 * returned indices describe the draw order instead, so batching
 * (`flushBatches`/`includeBatch`) never has to physically move the
 * (potentially large) `commands` array around.
 * @returns Indices into `commands`, in draw order. Backed by a buffer
 * reused across calls; only valid until the next call.
 */
const computeDrawOrder = (
  commands: RenderCommand[],
): Uint32Array<ArrayBufferLike> => {
  const commandCount = commands.length;

  drawOrderBuffer = ensureUint32Capacity(drawOrderBuffer, commandCount);

  if (commandCount === 0) {
    return drawOrderBuffer.subarray(0, 0);
  }

  const layerIndexByLayer = new Map<number, number>();
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  for (const command of commands) {
    layerIndexByLayer.set(command.layer, 0);

    if (command.depth < minDepth) {
      minDepth = command.depth;
    }

    if (command.depth > maxDepth) {
      maxDepth = command.depth;
    }
  }

  const sortedLayers = [...layerIndexByLayer.keys()].sort((a, b) => a - b);

  sortedLayers.forEach((layer, index) => layerIndexByLayer.set(layer, index));

  const depthBucketsPerLayer = Math.max(
    1,
    Math.min(
      DEFAULT_DEPTH_BUCKETS_PER_LAYER,
      Math.floor(MAX_TOTAL_DEPTH_BUCKETS / sortedLayers.length),
    ),
  );
  const depthRange = maxDepth - minDepth || 1;
  const bucketCount = sortedLayers.length * depthBucketsPerLayer;

  bucketKeysBuffer = ensureUint32Capacity(bucketKeysBuffer, commandCount);
  bucketOffsetsBuffer = ensureUint32Capacity(
    bucketOffsetsBuffer,
    bucketCount + 1,
  );
  bucketOffsetsBuffer.fill(0, 0, bucketCount + 1);

  for (let i = 0; i < commandCount; i++) {
    const command = commands[i];
    const layerIndex = layerIndexByLayer.get(command.layer)!;
    const depthBucket = quantizeDepthToBucket(
      command.depth,
      minDepth,
      depthRange,
      depthBucketsPerLayer,
    );
    const key = layerIndex * depthBucketsPerLayer + depthBucket;

    bucketKeysBuffer[i] = key;
    bucketOffsetsBuffer[key + 1] += 1;
  }

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    bucketOffsetsBuffer[bucket + 1] += bucketOffsetsBuffer[bucket];
  }

  for (let i = 0; i < commandCount; i++) {
    const key = bucketKeysBuffer[i];

    drawOrderBuffer[bucketOffsetsBuffer[key]] = i;
    bucketOffsetsBuffer[key] += 1;
  }

  return drawOrderBuffer.subarray(0, commandCount);
};

const includeBatch = (
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  order: Uint32Array<ArrayBufferLike>,
  batchStart: number,
  batchEnd: number,
) => {
  const { gl } = renderContext;
  const { renderable } = commands[order[batchStart]];
  const batchLength = batchEnd - batchStart;

  renderable.material.setUniform('u_projection', projectionMatrix);
  renderable.bind(gl);

  const requiredBatchSize = batchLength * renderable.floatsPerInstance;
  const buffer = ensureInstanceDataBufferCapacity(requiredBatchSize);

  let instanceDataOffset = 0;

  for (let i = batchStart; i < batchEnd; i++) {
    renderable.bindInstanceData(
      commands[order[i]].components,
      buffer,
      instanceDataOffset,
    );

    instanceDataOffset += renderable.floatsPerInstance;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW, 0, requiredBatchSize);

  setupInstanceAttributesAndDraw(renderContext, renderable, batchLength);
};

const pushSpriteRenderCommands = (
  commands: RenderCommand[],
  spriteComponent: SpriteEcsComponent,
  entityPosition: PositionEcsComponent,
  rotationComponent: RotationEcsComponent | null,
  scaleComponent: ScaleEcsComponent | null,
  flipComponent: FlipEcsComponent | null,
): void => {
  const { renderable, layer, slices } = spriteComponent;
  const depth = spriteComponent.sortDepth ?? entityPosition.world.y;

  if (!slices) {
    commands.push({
      layer,
      depth,
      renderable,
      components: {
        position: entityPosition,
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: spriteComponent,
        flip: flipComponent,
      },
    });

    return;
  }

  const regions = computeNineSliceRegions(
    spriteComponent.width,
    spriteComponent.height,
    spriteComponent.pivot,
    spriteComponent.uvOffset,
    spriteComponent.uvScale,
    slices,
  );

  const rotationRadians = rotationComponent?.world ?? 0;
  const scaleX =
    (scaleComponent?.world.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
  const scaleY =
    (scaleComponent?.world.y ?? 1) * (flipComponent?.flipY ? -1 : 1);

  for (const region of regions) {
    const regionOffset = Vec2.rotate(
      { x: region.offset.x * scaleX, y: region.offset.y * scaleY },
      rotationRadians,
    );

    const regionPosition: PositionEcsComponent = {
      local: entityPosition.local,
      // Clone before adding: `entityPosition.world` is the entity's live
      // world position, so building a region's offset position must not
      // mutate it.
      world: Vec2.add(Vec2.clone(entityPosition.world), regionOffset),
    };

    const regionSprite: SpriteEcsComponent = {
      ...spriteComponent,
      width: region.size.x,
      height: region.size.y,
      // A fresh vector per region, not a shared constant: `pivot` may be
      // mutated in place downstream (e.g. by the sprite animation system),
      // and this object is unique to `regionSprite`.
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: region.uvOffset,
      uvScale: region.uvScale,
    };

    commands.push({
      layer,
      depth,
      renderable,
      components: {
        position: regionPosition,
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: regionSprite,
        flip: flipComponent,
      },
    });
  }
};

function buildCameraCommands(
  world: EcsWorld,
  sprites: SpriteEcsComponent[],
  spritePositions: PositionEcsComponent[],
  spriteEntities: readonly number[],
  cullingMask: number,
  commands: RenderCommand[],
): void {
  for (let s = 0; s < spriteEntities.length; s++) {
    const spriteComponent = sprites[s];

    if (!spriteComponent.enabled) {
      continue;
    }

    if (!matchesMask(spriteComponent.renderable.category, cullingMask)) {
      continue;
    }

    const spriteEntity = spriteEntities[s];
    const entityPosition = spritePositions[s];

    pushSpriteRenderCommands(
      commands,
      spriteComponent,
      entityPosition,
      world.getComponent<RotationEcsComponent>(spriteEntity, rotationId),
      world.getComponent<ScaleEcsComponent>(spriteEntity, scaleId),
      world.getComponent<FlipEcsComponent>(spriteEntity, flipId),
    );
  }
}

function flushBatches(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  order: Uint32Array<ArrayBufferLike>,
): void {
  let batchStart = 0;

  for (let i = 1; i <= order.length; i++) {
    const isBatchBoundary =
      i === order.length ||
      commands[order[i]].renderable !== commands[order[batchStart]].renderable;

    if (isBatchBoundary) {
      includeBatch(
        renderContext,
        projectionMatrix,
        commands,
        order,
        batchStart,
        i,
      );
      batchStart = i;
    }
  }
}

const commandBuffersByCameraIndex: RenderCommand[][] = [];
const clearedDestinationsThisFrame = new Set<RenderTarget | null>();

/**
 * Creates a render system that batches and renders sprites based on the camera view.
 *
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (world, { components: [cameras, cameraPositions] }) => {
    clearedDestinationsThisFrame.clear();

    const {
      entities: spriteEntities,
      components: [sprites, spritePositions],
    } = world.query<[SpriteEcsComponent, PositionEcsComponent]>([
      spriteId,
      positionId,
    ]);

    const {
      entities: textEntities,
      components: [textComponents, textMeshes, textPositions],
    } = world.query<
      [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
    >([textId, textMeshId, positionId]);

    for (let c = 0; c < cameras.length; c++) {
      const cameraComponent = cameras[c];
      const cameraPositionComponent = cameraPositions[c];

      const pixelsPerUnit = calculatePixelsPerUnit(
        renderContext.height,
        cameraComponent.verticalWorldUnits,
      );

      const projectionMatrix = createProjectionMatrix(
        renderContext.width,
        renderContext.height,
        cameraPositionComponent.world,
        cameraComponent.zoom,
        pixelsPerUnit,
      );

      let commands = commandBuffersByCameraIndex[c];

      if (!commands) {
        commands = [];
        commandBuffersByCameraIndex[c] = commands;
      }

      commands.length = 0;

      buildCameraCommands(
        world,
        sprites,
        spritePositions,
        spriteEntities,
        cameraComponent.cullingMask,
        commands,
      );

      buildTextCameraCommands(
        world,
        textComponents,
        textMeshes,
        textPositions,
        textEntities,
        cameraComponent.cullingMask,
        commands,
      );

      const target = cameraComponent.renderTarget ?? null;

      renderContext.bindRenderTarget(target);

      if (!clearedDestinationsThisFrame.has(target)) {
        renderContext.clear(cameraComponent.clearColor);
        clearedDestinationsThisFrame.add(target);
      }

      const order = computeDrawOrder(commands);

      flushBatches(renderContext, projectionMatrix, commands, order);
    }

    renderContext.gl.disable(renderContext.gl.BLEND);
  },
});
