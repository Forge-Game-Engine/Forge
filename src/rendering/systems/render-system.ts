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
import { QueryResult } from '../../ecs/index.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import {
  TextEcsComponent,
  textId,
} from '../../text/components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/components/text-mesh-component.js';
import { pushTextRenderCommands } from '../../text/rendering/glyph-quad.js';
import {
  CameraEcsComponent,
  cameraId,
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
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';
import { Renderable } from '../renderable.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { RenderCommand } from '../render-command.js';
import { computeNineSliceRegions } from '../utilities/compute-nine-slice-regions.js';
import { computeSpriteInstanceBounds } from '../utilities/sprite-instance-data-segment.js';

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

const includeBatch = (
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
  batchStart: number,
  batchEnd: number,
) => {
  const { gl } = renderContext;
  const { renderable } = commands[batchStart];
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
  const { renderable, slices } = spriteComponent;

  if (!slices) {
    commands.push({
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

const commandBounds: Rect = Rects.zero;

/**
 * Removes the commands whose quads don't overlap `viewBounds`, keeping the
 * rest in order, so nothing a camera can't see is uploaded or drawn. Every
 * command - a sprite, a nine-slice region or a glyph - is a quad drawn from
 * the same instance components, so one bounds test covers them all. Quads
 * touching the view's edge are kept.
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

    if (Rects.intersects(commandBounds, viewBounds)) {
      commands[visibleCount] = command;
      visibleCount++;
    }
  }

  commands.length = visibleCount;
}

function flushBatches(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: RenderCommand[],
): void {
  let batchStart = 0;

  for (let i = 1; i <= commands.length; i++) {
    const isBatchBoundary =
      i === commands.length ||
      commands[i].renderable !== commands[batchStart].renderable;

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

const ensureSortCapacity = (count: number): void => {
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
};

const setDrawItem = (
  index: number,
  entity: number,
  category: number,
  position: PositionEcsComponent,
  sprite: SpriteEcsComponent | null,
  text: TextEcsComponent | null,
  textMesh: TextMeshEcsComponent | null,
): void => {
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
};

/**
 * Collects one draw item per enabled sprite and text, in no particular
 * order.
 * @returns The number of draw items.
 */
const collectDrawItems = (
  spriteQuery: QueryResult<[SpriteEcsComponent, PositionEcsComponent]>,
  textQuery: QueryResult<
    [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
  >,
): number => {
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
    const sprite = sprites[s];

    if (sprite.enabled) {
      setDrawItem(
        count++,
        spriteEntities[s],
        sprite.renderable.category,
        spritePositions[s],
        sprite,
        null,
        null,
      );
    }
  }

  for (let t = 0; t < textEntities.length; t++) {
    const text = texts[t];

    if (text.enabled) {
      // Both renderables always share one category (see
      // `createTextRenderable`), so checking either one is sufficient.
      setDrawItem(
        count++,
        textEntities[t],
        textMeshes[t].fillRenderable.category,
        textPositions[t],
        null,
        text,
        textMeshes[t],
      );
    }
  }

  return count;
};

const writeSortKeys = (resolver: DrawOrderResolver, count: number): void => {
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
};

// Only needed when a camera y-sorts, so only written then.
const writeRootYSortKeys = (
  resolver: DrawOrderResolver,
  count: number,
): void => {
  for (let i = 0; i < count; i++) {
    // Negated, so a higher Y (further up the screen) draws first.
    writeSortableFloat64(
      -resolver.rootY(drawItems[i].entity),
      rootYHighKeys,
      rootYLowKeys,
      i,
    );
  }
};

const pushDrawItemCommands = (
  commands: RenderCommand[],
  item: DrawItem,
  optionalComponents: OptionalComponentAccessors,
  pixelRatio: number,
): void => {
  const { entity, sprite, text, textMesh, position } = item;
  const rotation = optionalComponents.getRotation(entity);
  const scale = optionalComponents.getScale(entity);

  if (sprite) {
    pushSpriteRenderCommands(
      commands,
      sprite,
      position,
      rotation,
      scale,
      optionalComponents.getFlip(entity),
    );

    return;
  }

  pushTextRenderCommands(
    commands,
    text!,
    textMesh!,
    position,
    rotation,
    scale,
    pixelRatio,
  );
};

interface OptionalComponentAccessors {
  getRotation: (entity: number) => RotationEcsComponent | null;
  getScale: (entity: number) => ScaleEcsComponent | null;
  getFlip: (entity: number) => FlipEcsComponent | null;
}

const commandBuffersByCameraIndex: RenderCommand[][] = [];
const clearedDestinationsThisFrame = new Set<RenderTarget | null>();
const drawOrderResolver = createDrawOrderResolver();

/**
 * Creates a render system that draws every camera's sprites and text,
 * batched by renderable. Each camera is projected from its view (see
 * `computeCameraView`), and sprites, nine-slice regions and glyphs whose
 * quads are outside that view are skipped before anything is uploaded.
 *
 * Sprites and text draw by `layer`, then by world order (see
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
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (world, { components: [cameras, cameraPositions] }) => {
    clearedDestinationsThisFrame.clear();

    const spriteQuery = world.query<[SpriteEcsComponent, PositionEcsComponent]>(
      [spriteId, positionId],
    );
    const textQuery = world.query<
      [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
    >([textId, textMeshId, positionId]);

    const itemCount = collectDrawItems(spriteQuery, textQuery);

    drawOrderResolver.resolve(world, spriteQuery.entities, textQuery.entities);
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
    // component's storage a single time instead of on every call.
    const optionalComponents: OptionalComponentAccessors = {
      getRotation: world.getComponentAccessor<RotationEcsComponent>(rotationId),
      getScale: world.getComponentAccessor<ScaleEcsComponent>(scaleId),
      getFlip: world.getComponentAccessor<FlipEcsComponent>(flipId),
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
            renderContext.pixelRatio,
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
});
