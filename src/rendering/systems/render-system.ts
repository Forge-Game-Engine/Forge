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
import { QueryMatches } from '../../ecs/index.js';
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
import { pushTextRenderCommands } from '../../text/rendering/glyph-quad.js';
import {
  CameraEcsComponent,
  cameraId,
  MaskEcsComponent,
  maskId,
  SpriteEcsComponent,
  spriteId,
} from '../components/index.js';
import { computeCameraView } from '../camera-view.js';
import {
  createDrawOrderResolver,
  DrawOrderResolver,
  float32ToSortableUint32,
  int32ToSortableUint32,
  radixSortByKeys,
  writeSortableFloat64,
} from '../draw-order.js';
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
function createSpriteRenderable(
  renderContext: RenderContext,
  material: SpriteMaterial,
): Renderable {
  return new Renderable(
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
}

/**
 * The renderables one render system draws with, created on its first
 * frame: one per sprite material, and the text renderables. Every instance
 * is drawn from the render context's `quadGeometry`.
 */
interface RenderResources {
  getSpriteRenderable: (material: SpriteMaterial) => Renderable;
  getTextRenderables: () => TextRenderables;
}

function createRenderResources(renderContext: RenderContext): RenderResources {
  const spriteRenderables = new WeakMap<SpriteMaterial, Renderable>();
  let textRenderables: TextRenderables | null = null;

  return {
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
}

function setupInstanceAttributesAndDraw(
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
): void {
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
}

let instanceDataBuffer = new Float32Array(0);

function ensureInstanceDataBufferCapacity(size: number): Float32Array {
  if (instanceDataBuffer.length < size) {
    instanceDataBuffer = new Float32Array(size);
  }

  return instanceDataBuffer;
}

function includeBatch(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  batchStart: number,
  batchEnd: number,
): void {
  const { gl } = renderContext;
  const firstCommand = commands[batchStart];
  const { renderable } = firstCommand;
  const batchLength = batchEnd - batchStart;

  renderable.material.setUniform('u_projection', projectionMatrix);
  renderable.bindBatch(gl, firstCommand);
  renderContext.quadGeometry.bind(renderable.material);

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

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW, 0, requiredBatchSize);

  setupInstanceAttributesAndDraw(renderContext, renderable, batchLength);
}

function pushSpriteRenderCommands(
  commands: RenderCommand[],
  renderable: Renderable,
  components: InstanceComponents,
): void {
  const {
    sprite: spriteComponent,
    position: entityPosition,
    rotation: rotationComponent,
    scale: scaleComponent,
    flip: flipComponent,
    mask,
  } = components;
  const { texture, slices } = spriteComponent;
  const emissiveTexture = spriteComponent.emissive?.texture ?? null;

  if (!slices) {
    commands.push({
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
function isSameBatch(a: RenderCommand, b: RenderCommand): boolean {
  return (
    a.renderable === b.renderable &&
    a.texture === b.texture &&
    a.emissiveTexture === b.emissiveTexture
  );
}

function flushBatches(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
): void {
  // Nothing can be drawn until the context is restored, and a material
  // created while it's lost has no program to look attributes up in yet.
  if (renderContext.isContextLost) {
    return;
  }

  let batchStart = 0;

  for (let i = 1; i <= commands.length; i++) {
    const isBatchBoundary =
      i === commands.length || !isSameBatch(commands[i], commands[batchStart]);

    if (isBatchBoundary) {
      includeBatch(renderContext, projectionMatrix, commands, batchStart, i);
      batchStart = i;
    }
  }
}

/**
 * One sprite or one text of an entity, sorted as a unit: its commands (a
 * quad, nine-slice regions, or glyphs) are pushed together, in a fixed
 * order, wherever it lands in the draw order.
 */
interface DrawItem {
  entity: number;
  category: number;
  sprite: SpriteEcsComponent | null;
  text: TextEcsComponent | null;
  textMesh: TextMeshEcsComponent | null;
  position: PositionEcsComponent;
}

// Draw items and sort keys, reused across frames so a frame allocates
// nothing for them once they've grown to the scene's size.
const drawItems: DrawItem[] = [];
let layerKeys = new Uint32Array(0);
let worldOrderKeys = new Uint32Array(0);
let rootYHighKeys = new Uint32Array(0);
let rootYLowKeys = new Uint32Array(0);
let rootSequenceHighKeys = new Uint32Array(0);
let rootSequenceLowKeys = new Uint32Array(0);
let hierarchyKeys = new Uint32Array(0);
let hierarchyOrderBuffer = new Uint32Array(0);
let ySortedOrderBuffer = new Uint32Array(0);
let hierarchySortScratch = new Uint32Array(0);
let ySortScratch = new Uint32Array(0);

function ensureSortCapacity(count: number): void {
  if (hierarchyKeys.length >= count) {
    return;
  }

  const capacity = Math.max(64, hierarchyKeys.length * 2, count);

  layerKeys = new Uint32Array(capacity);
  worldOrderKeys = new Uint32Array(capacity);
  rootYHighKeys = new Uint32Array(capacity);
  rootYLowKeys = new Uint32Array(capacity);
  rootSequenceHighKeys = new Uint32Array(capacity);
  rootSequenceLowKeys = new Uint32Array(capacity);
  hierarchyKeys = new Uint32Array(capacity);
  hierarchyOrderBuffer = new Uint32Array(capacity);
  ySortedOrderBuffer = new Uint32Array(capacity);
  hierarchySortScratch = new Uint32Array(capacity);
  ySortScratch = new Uint32Array(capacity);
}

function setDrawItem(
  index: number,
  entity: number,
  category: number,
  position: PositionEcsComponent,
  sprite: SpriteEcsComponent | null,
  text: TextEcsComponent | null,
  textMesh: TextMeshEcsComponent | null,
): void {
  const item = drawItems[index];

  if (!item) {
    drawItems[index] = { entity, category, position, sprite, text, textMesh };

    return;
  }

  item.entity = entity;
  item.category = category;
  item.position = position;
  item.sprite = sprite;
  item.text = text;
  item.textMesh = textMesh;
}

/**
 * Collects one draw item per sprite and text visible in the hierarchy (see
 * `VisibilityEcsComponent`), in no particular order.
 * @returns The number of draw items.
 */
function collectDrawItems(
  resolver: DrawOrderResolver,
  spriteQuery: QueryMatches<[SpriteEcsComponent, PositionEcsComponent]>,
  textQuery: QueryMatches<
    [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
  >,
): number {
  const {
    entities: spriteEntities,
    components: [sprites, spritePositions],
  } = spriteQuery;
  const {
    entities: textEntities,
    components: [texts, textMeshes, textPositions],
  } = textQuery;
  let count = 0;

  for (let s = 0; s < spriteEntities.length; s++) {
    if (resolver.isVisible(spriteEntities[s])) {
      setDrawItem(
        count++,
        spriteEntities[s],
        sprites[s].category,
        spritePositions[s],
        sprites[s],
        null,
        null,
      );
    }
  }

  for (let t = 0; t < textEntities.length; t++) {
    if (resolver.isVisible(textEntities[t])) {
      setDrawItem(
        count++,
        textEntities[t],
        texts[t].category,
        textPositions[t],
        null,
        texts[t],
        textMeshes[t],
      );
    }
  }

  return count;
}

function writeSortKeys(resolver: DrawOrderResolver, count: number): void {
  ensureSortCapacity(count);

  for (let i = 0; i < count; i++) {
    const { entity, sprite, text } = drawItems[i];
    const layer = sprite ? sprite.layer : text!.layer;

    const rootSequence = resolver.rootSequence(entity);

    layerKeys[i] = float32ToSortableUint32(layer);
    worldOrderKeys[i] = int32ToSortableUint32(resolver.worldOrder(entity));
    rootSequenceHighKeys[i] = Math.floor(rootSequence / 0x100000000);
    rootSequenceLowKeys[i] = rootSequence >>> 0;
    // An entity's sprite draws before its text.
    hierarchyKeys[i] = resolver.hierarchyIndex(entity) * 2 + (sprite ? 0 : 1);
  }
}

// Only needed when a camera y-sorts, so only written then.
function writeRootYSortKeys(resolver: DrawOrderResolver, count: number): void {
  for (let i = 0; i < count; i++) {
    // Negated, so a higher Y (further up the screen) draws first.
    writeSortableFloat64(
      -resolver.rootY(drawItems[i].entity),
      rootYHighKeys,
      rootYLowKeys,
      i,
    );
  }
}

function pushDrawItemCommands(
  commands: RenderCommand[],
  item: DrawItem,
  optionalComponents: OptionalComponentAccessors,
  renderContext: RenderContext,
  resources: RenderResources,
): void {
  const { entity, sprite, text, textMesh, position } = item;
  const mask = optionalComponents.getMask(entity);

  // Hidden entirely by its masks, so nothing to draw.
  if (mask && !mask.visible) {
    return;
  }

  const rotation = optionalComponents.getRotation(entity);
  const scale = optionalComponents.getScale(entity);

  if (sprite) {
    pushSpriteRenderCommands(
      commands,
      resources.getSpriteRenderable(
        sprite.material ?? renderContext.spriteMaterial,
      ),
      {
        position,
        rotation,
        scale,
        sprite,
        flip: optionalComponents.getFlip(entity),
        mask,
      },
    );

    return;
  }

  pushTextRenderCommands(
    commands,
    text!,
    textMesh!,
    resources.getTextRenderables(),
    { position, rotation, scale, mask },
    renderContext.pixelRatio,
  );
}

interface OptionalComponentAccessors {
  getRotation: (entity: number) => RotationEcsComponent | null;
  getScale: (entity: number) => ScaleEcsComponent | null;
  getFlip: (entity: number) => FlipEcsComponent | null;
  getMask: InstanceMaskResolver;
}

const commandBuffersByCameraIndex: RenderCommand[][] = [];
const clearedDestinationsThisFrame = new Set<RenderTarget | null>();
const drawOrderResolver = createDrawOrderResolver();

/**
 * Creates a render system that draws every camera's sprites and text.
 * Consecutive quads (in draw order) with the same material, texture and
 * emissive map draw in one instanced draw call. Each camera is projected
 * from its view (see `computeCameraView`), and sprites, nine-slice regions
 * and glyphs whose quads are outside that view are skipped before anything
 * is uploaded.
 *
 * Sprites and text hidden in the hierarchy (see `VisibilityEcsComponent`)
 * aren't drawn. The rest draw by `layer`, then by world order (see
 * `DrawOrderEcsComponent`), then, for a camera with `ySort`, by their root
 * entity's Y (higher first), then in hierarchy order: root entities in
 * creation order, each followed by its subtree in pre-order. That's a total
 * order, resolved and sorted once per frame with an exact radix sort. An
 * entity's sprite draws before its text.
 *
 * @param renderContext The rendering context
 * @returns The render ECS system
 */
export const createRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<
  [CameraEcsComponent, PositionEcsComponent],
  {
    sprites: [SpriteEcsComponent, PositionEcsComponent];
    texts: [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent];
    masks: [MaskEcsComponent];
  }
> => {
  let resources: RenderResources | null = null;

  return {
    query: [cameraId, positionId],
    queries: {
      sprites: { query: [spriteId, positionId] },
      texts: { query: [textId, textMeshId, positionId] },
      masks: { query: [maskId] },
    },
    update: (
      world,
      { components: [cameras, cameraPositions] },
      { sprites: spriteQuery, texts: textQuery, masks },
    ) => {
      clearedDestinationsThisFrame.clear();
      resources ??= createRenderResources(renderContext);

      drawOrderResolver.resolve(
        world,
        spriteQuery.entities,
        textQuery.entities,
      );

      const itemCount = collectDrawItems(
        drawOrderResolver,
        spriteQuery,
        textQuery,
      );

      writeSortKeys(drawOrderResolver, itemCount);

      const hierarchyOrder = radixSortByKeys(
        [
          layerKeys,
          worldOrderKeys,
          rootSequenceHighKeys,
          rootSequenceLowKeys,
          hierarchyKeys,
        ],
        itemCount,
        hierarchyOrderBuffer,
        hierarchySortScratch,
      );
      let ySortedOrder: Uint32Array | null = null;

      // Resolved once per frame rather than once per sprite: rotation/scale/
      // flip are optional (not every sprite has them, so they can't just be
      // added to the query above), and `getComponentAccessor` resolves a
      // component's storage a single time instead of on every call. Masks
      // are resolved for each entity once per frame, shared by every camera.
      const optionalComponents: OptionalComponentAccessors = {
        getRotation:
          world.getComponentAccessor<RotationEcsComponent>(rotationId),
        getScale: world.getComponentAccessor<ScaleEcsComponent>(scaleId),
        getFlip: world.getComponentAccessor<FlipEcsComponent>(flipId),
        getMask: createInstanceMaskResolver(world, masks),
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

        if (cameraComponent.ySort && !ySortedOrder) {
          writeRootYSortKeys(drawOrderResolver, itemCount);
          ySortedOrder = radixSortByKeys(
            [
              layerKeys,
              worldOrderKeys,
              rootYHighKeys,
              rootYLowKeys,
              rootSequenceHighKeys,
              rootSequenceLowKeys,
              hierarchyKeys,
            ],
            itemCount,
            ySortedOrderBuffer,
            ySortScratch,
          );
        }

        const order = cameraComponent.ySort ? ySortedOrder! : hierarchyOrder;
        let commands = commandBuffersByCameraIndex[c];

        if (!commands) {
          commands = [];
          commandBuffersByCameraIndex[c] = commands;
        }

        commands.length = 0;

        for (let i = 0; i < itemCount; i++) {
          const item = drawItems[order[i]];

          if (matchesMask(item.category, cameraComponent.cullingMask)) {
            pushDrawItemCommands(
              commands,
              item,
              optionalComponents,
              renderContext,
              resources,
            );
          }
        }

        cullCommandsOutsideView(commands, view.bounds);

        const target = cameraComponent.renderTarget ?? null;

        renderContext.bindRenderTarget(target);

        if (!clearedDestinationsThisFrame.has(target)) {
          renderContext.clear(cameraComponent.clearColor);
          clearedDestinationsThisFrame.add(target);
        }

        flushBatches(renderContext, projectionMatrix, commands);
      }

      renderContext.gl.disable(renderContext.gl.BLEND);
    },
  };
};
