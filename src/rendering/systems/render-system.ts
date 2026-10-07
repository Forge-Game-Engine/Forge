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
import { Matrix3x3, Rect, Rects, Vec2 } from '../../math/index.js';
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
import {
  createTextRenderables,
  TextRenderables,
} from '../../text/rendering/create-text-renderables.js';
import { buildTextCameraCommands } from '../../text/rendering/glyph-quad.js';
import {
  CameraEcsComponent,
  cameraId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { computeCameraView } from '../camera-view.js';
import { createQuadGeometry, Geometry } from '../geometry/index.js';
import { SpriteMaterial } from '../materials/sprite-material.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';
import { InstanceComponents, Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/utils/create-projection-matrix.js';
import { RenderCommand } from '../render-command.js';
import { computeNineSliceRegions } from '../utilities/compute-nine-slice-regions.js';
import { combineInstanceDataSegments } from '../utilities/instance-data-segment.js';
import { maskInstanceDataSegment } from '../utilities/mask-instance-data-segment.js';
import {
  createInstanceMaskResolver,
  InstanceMaskResolver,
} from '../utilities/resolve-instance-mask.js';
import { spriteEmissiveInstanceDataSegment } from '../utilities/sprite-emissive-instance-data-segment.js';
import {
  computeSpriteInstanceBounds,
  spriteInstanceDataSegment,
} from '../utilities/sprite-instance-data-segment.js';

/** The instance layout every sprite material's `sprite.vert` reads. */
const spriteInstanceLayout = combineInstanceDataSegments(
  spriteInstanceDataSegment,
  spriteEmissiveInstanceDataSegment,
  maskInstanceDataSegment,
);

/**
 * Creates the renderable that draws sprites with `material`, binding each
 * batch's texture and emissive map (or the black texture) to it.
 */
const createSpriteRenderable = (
  renderContext: RenderContext,
  material: SpriteMaterial,
): Renderable =>
  new Renderable(
    material,
    spriteInstanceLayout.floatsPerInstance,
    spriteInstanceLayout.bindInstanceData,
    spriteInstanceLayout.setupInstanceAttributes,
    (gl, command) => {
      material.bindSprites(
        gl,
        command.texture,
        command.emissiveTexture ?? renderContext.blackTexture,
      );
    },
  );

/**
 * The GPU resources one render system draws with, created on its first
 * frame: the quad every instance is drawn from, a renderable per sprite
 * material, and the text renderables.
 */
interface RenderResources {
  quad: Geometry;
  getSpriteRenderable: (material: SpriteMaterial) => Renderable;
  getTextRenderables: () => TextRenderables;
}

const createRenderResources = (
  renderContext: RenderContext,
): RenderResources => {
  const spriteRenderables = new WeakMap<SpriteMaterial, Renderable>();
  let textRenderables: TextRenderables | null = null;

  return {
    quad: createQuadGeometry(renderContext.gl),
    getSpriteRenderable: (material) => {
      let renderable = spriteRenderables.get(material);

      if (!renderable) {
        renderable = createSpriteRenderable(renderContext, material);
        spriteRenderables.set(material, renderable);
      }

      return renderable;
    },
    getTextRenderables: () => {
      textRenderables ??= createTextRenderables(renderContext);

      return textRenderables;
    },
  };
};

const setupInstanceAttributesAndDraw = (
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
) => {
  const { gl } = renderContext;

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  renderable.setupInstanceAttributes(gl, renderable);

  // Fragment shaders output straight (non-premultiplied) alpha, and every
  // destination - the canvas and every render target - stores
  // premultiplied alpha. Color uses the straight-alpha "over" factors, which
  // premultiplies it on the way in. Alpha needs `ONE` instead of `SRC_ALPHA`
  // as its source factor: reusing the color factors would store `a * a`
  // instead of `a`, so a translucent sprite drawn into a transparent render
  // target would lose most of its opacity again when that target is
  // presented, and the canvas itself would turn partially transparent
  // behind translucent sprites, letting the page show through.
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
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
  quad: Geometry,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  order: Uint32Array<ArrayBufferLike>,
  batchStart: number,
  batchEnd: number,
) => {
  const { gl } = renderContext;
  const firstCommand = commands[order[batchStart]];
  const { renderable } = firstCommand;
  const batchLength = batchEnd - batchStart;

  renderable.material.setUniform('u_projection', projectionMatrix);
  renderable.bindBatch(gl, firstCommand);
  quad.bind(gl, renderable.material.program);

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
  renderable: Renderable,
  components: InstanceComponents,
): void => {
  const {
    sprite: spriteComponent,
    position: entityPosition,
    rotation: rotationComponent,
    scale: scaleComponent,
    flip: flipComponent,
    mask,
  } = components;
  const { texture, layer, slices } = spriteComponent;
  const emissiveTexture = spriteComponent.emissive?.texture ?? null;
  const depth = spriteComponent.sortDepth ?? entityPosition.world.y;

  if (!slices) {
    commands.push({
      layer,
      depth,
      renderable,
      texture,
      emissiveTexture,
      components,
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
      texture,
      emissiveTexture,
      components: {
        position: regionPosition,
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: regionSprite,
        flip: flipComponent,
        mask,
      },
    });
  }
};

interface OptionalSpriteComponentAccessors {
  getRotation: (entity: number) => RotationEcsComponent | null;
  getScale: (entity: number) => ScaleEcsComponent | null;
  getFlip: (entity: number) => FlipEcsComponent | null;
  getMask: InstanceMaskResolver;
}

/** How to find the renderable a sprite draws with. */
interface SpriteRenderableSource {
  /** The render context, whose `spriteMaterial` draws sprites without one. */
  renderContext: RenderContext;
  getSpriteRenderable: (material: SpriteMaterial) => Renderable;
}

function buildCameraCommands(
  sprites: SpriteEcsComponent[],
  spritePositions: PositionEcsComponent[],
  spriteEntities: readonly number[],
  cullingMask: number,
  commands: RenderCommand[],
  optionalComponents: OptionalSpriteComponentAccessors,
  renderables: SpriteRenderableSource,
): void {
  const { getRotation, getScale, getFlip, getMask } = optionalComponents;
  const { renderContext, getSpriteRenderable } = renderables;

  for (let s = 0; s < spriteEntities.length; s++) {
    const spriteComponent = sprites[s];

    if (!spriteComponent.enabled) {
      continue;
    }

    if (!matchesMask(spriteComponent.category, cullingMask)) {
      continue;
    }

    const spriteEntity = spriteEntities[s];
    const mask = getMask(spriteEntity);

    if (mask && !mask.visible) {
      continue;
    }

    pushSpriteRenderCommands(
      commands,
      getSpriteRenderable(
        spriteComponent.material ?? renderContext.spriteMaterial,
      ),
      {
        position: spritePositions[s],
        rotation: getRotation(spriteEntity),
        scale: getScale(spriteEntity),
        sprite: spriteComponent,
        flip: getFlip(spriteEntity),
        mask,
      },
    );
  }
}

const commandBounds: Rect = Rects.zero;

/**
 * Removes the commands whose quads don't overlap `viewBounds`, or the
 * bounds of the masks they're drawn through, keeping the rest in order, so
 * nothing a camera can't see is uploaded or drawn. Every command - a
 * sprite, a nine-slice region or a glyph - is a quad drawn from the same
 * instance components, so one bounds test covers them all. Quads touching
 * the view's edge are kept.
 * @param commands - The camera's commands, compacted in place.
 * @param viewBounds - The world-space area the camera shows.
 */
function cullCommandsOutsideView(
  commands: RenderCommand[],
  viewBounds: Rect,
): void {
  let visibleCount = 0;

  for (const command of commands) {
    computeSpriteInstanceBounds(command.components, commandBounds);

    const { mask } = command.components;

    if (
      Rects.intersects(commandBounds, viewBounds) &&
      (!mask || Rects.intersects(commandBounds, mask.bounds))
    ) {
      commands[visibleCount] = command;
      visibleCount++;
    }
  }

  commands.length = visibleCount;
}

/**
 * Whether two commands draw in the same instanced batch: the same
 * renderable (material and instance layout), texture and emissive map.
 */
const isSameBatch = (a: RenderCommand, b: RenderCommand): boolean =>
  a.renderable === b.renderable &&
  a.texture === b.texture &&
  a.emissiveTexture === b.emissiveTexture;

function flushBatches(
  renderContext: RenderContext,
  quad: Geometry,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  order: Uint32Array<ArrayBufferLike>,
): void {
  let batchStart = 0;

  for (let i = 1; i <= order.length; i++) {
    const isBatchBoundary =
      i === order.length ||
      !isSameBatch(commands[order[i]], commands[order[batchStart]]);

    if (isBatchBoundary) {
      includeBatch(
        renderContext,
        quad,
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
 * Creates a render system that draws every camera's sprites and text.
 * Consecutive quads (in draw order) with the same material, texture and
 * emissive map draw in one instanced draw call. Each camera is projected from its view (see
 * `computeCameraView`), and sprites, nine-slice regions and glyphs whose
 * quads are outside that view are skipped before anything is uploaded.
 *
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => {
  let resources: RenderResources | null = null;

  return {
    query: [cameraId, positionId],
    update: (world, { components: [cameras, cameraPositions] }) => {
      clearedDestinationsThisFrame.clear();
      resources ??= createRenderResources(renderContext);

      const { quad, getSpriteRenderable, getTextRenderables } = resources;
      const spriteRenderables: SpriteRenderableSource = {
        renderContext,
        getSpriteRenderable,
      };

      const {
        entities: spriteEntities,
        components: [sprites, spritePositions],
      } = world.query<[SpriteEcsComponent, PositionEcsComponent]>([
        spriteId,
        positionId,
      ]);

      const textQuery = world.query<
        [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
      >([textId, textMeshId, positionId]);

      // Resolved once per frame rather than once per sprite: rotation/scale/
      // flip are optional (not every sprite has them, so they can't just be
      // added to the query above), and `getComponentAccessor` resolves a
      // component's storage a single time instead of on every call. Masks
      // are resolved for each entity once per frame, shared by every camera.
      const optionalComponents: OptionalSpriteComponentAccessors = {
        getRotation:
          world.getComponentAccessor<RotationEcsComponent>(rotationId),
        getScale: world.getComponentAccessor<ScaleEcsComponent>(scaleId),
        getFlip: world.getComponentAccessor<FlipEcsComponent>(flipId),
        getMask: createInstanceMaskResolver(world),
      };

      for (let c = 0; c < cameras.length; c++) {
        const cameraComponent = cameras[c];
        const cameraPositionComponent = cameraPositions[c];

        const view = computeCameraView(
          cameraComponent,
          cameraPositionComponent,
          renderContext,
        );
        const projectionMatrix = createProjectionMatrix(view.bounds);

        let commands = commandBuffersByCameraIndex[c];

        if (!commands) {
          commands = [];
          commandBuffersByCameraIndex[c] = commands;
        }

        commands.length = 0;

        buildCameraCommands(
          sprites,
          spritePositions,
          spriteEntities,
          cameraComponent.cullingMask,
          commands,
          optionalComponents,
          spriteRenderables,
        );

        buildTextCameraCommands(
          world,
          textQuery,
          cameraComponent.cullingMask,
          commands,
          getTextRenderables,
          optionalComponents.getMask,
          renderContext.pixelRatio,
        );

        cullCommandsOutsideView(commands, view.bounds);

        const target = cameraComponent.renderTarget ?? null;

        renderContext.bindRenderTarget(target);

        if (!clearedDestinationsThisFrame.has(target)) {
          renderContext.clear(cameraComponent.clearColor);
          clearedDestinationsThisFrame.add(target);
        }

        const order = computeDrawOrder(commands);

        flushBatches(renderContext, quad, projectionMatrix, commands, order);
      }

      renderContext.gl.disable(renderContext.gl.BLEND);
    },
  };
};
