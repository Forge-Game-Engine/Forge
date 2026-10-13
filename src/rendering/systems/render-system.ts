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
import {
  createTextRenderables,
  TextRenderables,
} from '../../text/rendering/create-text-renderables.js';
import {
  pushTextRenderCommands,
  TextTransform,
} from '../../text/rendering/glyph-quad.js';
import {
  CameraEcsComponent,
  cameraId,
  MeshEcsComponent,
  meshId,
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
import {
  MeshRenderCommand,
  QuadRenderCommand,
  RenderCommand,
} from '../render-command.js';
import { computeNineSliceRegions } from '../utilities/compute-nine-slice-regions.js';
import { combineInstanceDataSegments } from '../utilities/instance-data-segment.js';
import { maskInstanceDataSegment } from '../utilities/mask-instance-data-segment.js';
import {
  createInstanceMaskResolver,
  InstanceMask,
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

function enableStraightAlphaBlending(gl: WebGL2RenderingContext): void {
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
}

function setupInstanceAttributesAndDraw(
  renderContext: RenderContext,
  renderable: Renderable,
  batchLength: number,
): void {
  const { gl } = renderContext;

  gl.bindBuffer(gl.ARRAY_BUFFER, renderContext.instanceBuffer);
  renderable.setupInstanceAttributes(gl, renderable);
  enableStraightAlphaBlending(gl);
  renderContext.quadGeometry.drawInstanced(batchLength);
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
  commands: readonly RenderCommand[],
  firstCommand: QuadRenderCommand,
  batchStart: number,
  batchEnd: number,
): void {
  const { gl } = renderContext;
  const { renderable } = firstCommand;
  const batchLength = batchEnd - batchStart;

  renderable.material.setUniform('u_projection', projectionMatrix);
  renderable.bindBatch(gl, firstCommand);
  renderContext.quadGeometry.bind(renderable.material);

  const requiredBatchSize = batchLength * renderable.floatsPerInstance;
  const buffer = ensureInstanceDataBufferCapacity(requiredBatchSize);

  let instanceDataOffset = 0;

  for (let i = batchStart; i < batchEnd; i++) {
    const command = commands[i];

    // Always a quad: a mesh never joins a batch (see `isSameBatch`).
    if (command.kind === 'quad') {
      renderable.bindInstanceData(
        command.components,
        buffer,
        instanceDataOffset,
      );

      instanceDataOffset += renderable.floatsPerInstance;
    }
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
      kind: 'quad',
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
      kind: 'quad',
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

/**
 * Builds an entity's world transform for its mesh: translate, then rotate,
 * then scale, so a local vertex is scaled, turned and then moved into place.
 * A missing rotation or scale counts as `0` or `(1, 1)`, as for sprites.
 */
function createModelMatrix(
  position: PositionEcsComponent,
  rotation: RotationEcsComponent | null,
  scale: ScaleEcsComponent | null,
): Matrix3x3 {
  return Matrix3x3.identity
    .translate(position.world.x, position.world.y)
    .rotate(rotation?.world ?? 0)
    .scale(scale?.world.x ?? 1, scale?.world.y ?? 1);
}

/**
 * The axis-aligned rectangle around `bounds`' four corners mapped by
 * `matrix`.
 */
function transformBounds(matrix: Matrix3x3, bounds: Rect): Rect {
  const [m0, m1, , m3, m4, , m6, m7] = matrix.matrix;
  const result: Rect = {
    min: { x: Infinity, y: Infinity },
    max: { x: -Infinity, y: -Infinity },
  };

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      const worldX = m0 * x + m3 * y + m6;
      const worldY = m1 * x + m4 * y + m7;

      result.min.x = Math.min(result.min.x, worldX);
      result.min.y = Math.min(result.min.y, worldY);
      result.max.x = Math.max(result.max.x, worldX);
      result.max.y = Math.max(result.max.y, worldY);
    }
  }

  return result;
}

function pushMeshRenderCommand(
  commands: RenderCommand[],
  mesh: MeshEcsComponent,
  position: PositionEcsComponent,
  rotation: RotationEcsComponent | null,
  scale: ScaleEcsComponent | null,
  mask: InstanceMask | null,
): void {
  const { geometry } = mesh;

  if (geometry.vertexCount === 0) {
    return;
  }

  const model = createModelMatrix(position, rotation, scale);

  commands.push({
    kind: 'mesh',
    mesh,
    model,
    bounds: transformBounds(model, geometry.bounds),
    mask,
  });
}

const commandBounds: Rect = Rects.zero;

/**
 * A command's world-space bounds: a quad's, computed from its instance
 * components into a shared rect, or a mesh's, computed when it was pushed.
 */
function computeCommandBounds(command: RenderCommand): Rect {
  if (command.kind === 'mesh') {
    return command.bounds;
  }

  return computeSpriteInstanceBounds(command.components, commandBounds);
}

function getCommandMask(command: RenderCommand): InstanceMask | null {
  return command.kind === 'mesh' ? command.mask : command.components.mask;
}

/**
 * Removes the commands whose bounds don't overlap `viewBounds`, or the
 * bounds of the masks they're drawn through, keeping the rest in order, so
 * nothing a camera can't see is uploaded or drawn. Commands touching the
 * view's edge are kept.
 * @param commands - The camera's commands, compacted in place.
 * @param viewBounds - The world-space area the camera shows.
 */
function cullCommandsOutsideView(
  commands: RenderCommand[],
  viewBounds: Rect,
): void {
  let visibleCount = 0;

  for (const command of commands) {
    const bounds = computeCommandBounds(command);
    const mask = getCommandMask(command);

    if (
      Rects.intersects(bounds, viewBounds) &&
      (!mask || Rects.intersects(bounds, mask.bounds))
    ) {
      commands[visibleCount] = command;
      visibleCount++;
    }
  }

  commands.length = visibleCount;
}

/**
 * Whether a command draws in the same instanced batch as a batch's first
 * quad: a quad with the same renderable (material and instance layout),
 * texture and emissive map. A mesh never does, so it ends the batch before
 * it.
 */
function isSameBatch(
  command: RenderCommand,
  batchFirst: QuadRenderCommand,
): boolean {
  return (
    command.kind === 'quad' &&
    command.renderable === batchFirst.renderable &&
    command.texture === batchFirst.texture &&
    command.emissiveTexture === batchFirst.emissiveTexture
  );
}

/** Draws one mesh with one draw call, through its entity's transform. */
function drawMesh(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  command: MeshRenderCommand,
): void {
  const { gl } = renderContext;
  const { geometry, material } = command.mesh;

  material.bindMesh(gl, command.model, projectionMatrix, command.mask);
  geometry.bind(material);
  enableStraightAlphaBlending(gl);
  geometry.draw();
}

/**
 * Draws a camera's commands in order: each run of quads that batch together
 * as one instanced draw, and each mesh as a draw of its own.
 * @param renderContext - The render context to draw with.
 * @param projectionMatrix - The camera's world to clip space projection.
 * @param commands - The camera's commands, in draw order.
 */
function drawCommands(
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
  commands: readonly RenderCommand[],
): void {
  // Nothing can be drawn until the context is restored, and a material
  // created while it's lost has no program to look attributes up in yet.
  if (renderContext.isContextLost) {
    return;
  }

  let i = 0;

  while (i < commands.length) {
    const command = commands[i];

    if (command.kind === 'mesh') {
      drawMesh(renderContext, projectionMatrix, command);
      i++;

      continue;
    }

    let batchEnd = i + 1;

    while (
      batchEnd < commands.length &&
      isSameBatch(commands[batchEnd], command)
    ) {
      batchEnd++;
    }

    includeBatch(
      renderContext,
      projectionMatrix,
      commands,
      command,
      i,
      batchEnd,
    );
    i = batchEnd;
  }
}

/**
 * The kinds of draw item, in the order one entity's items draw: its mesh
 * behind its sprite, and its sprite behind its text.
 */
const MESH_ITEM_KIND = 0;
const SPRITE_ITEM_KIND = 1;
const TEXT_ITEM_KIND = 2;
const DRAW_ITEM_KIND_COUNT = 3;

type DrawItemKind =
  typeof MESH_ITEM_KIND | typeof SPRITE_ITEM_KIND | typeof TEXT_ITEM_KIND;

/**
 * One mesh, sprite or text of an entity, sorted as a unit: its commands (a
 * mesh, a quad, nine-slice regions, or glyphs) are pushed together, in a
 * fixed order, wherever it lands in the draw order. Only the component of
 * its `kind` is set.
 */
interface DrawItem {
  entity: number;
  kind: DrawItemKind;
  category: number;
  layer: number;
  mesh: MeshEcsComponent | null;
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

/**
 * Reuses (or creates) the draw item at `index` for one of an entity's
 * components, cleared of the component it held last frame. The caller sets
 * its category, layer and component.
 * @returns The draw item.
 */
function setDrawItem(
  index: number,
  entity: number,
  kind: DrawItemKind,
  position: PositionEcsComponent,
): DrawItem {
  let item = drawItems[index];

  if (!item) {
    item = {
      entity,
      kind,
      category: 0,
      layer: 0,
      mesh: null,
      sprite: null,
      text: null,
      textMesh: null,
      position,
    };
    drawItems[index] = item;
  }

  item.entity = entity;
  item.kind = kind;
  item.position = position;
  item.mesh = null;
  item.sprite = null;
  item.text = null;
  item.textMesh = null;

  return item;
}

/**
 * Collects one draw item per mesh, sprite and text visible in the hierarchy
 * (see `VisibilityEcsComponent`), in no particular order.
 * @returns The number of draw items.
 */
function collectDrawItems(
  resolver: DrawOrderResolver,
  meshQuery: QueryResult<[MeshEcsComponent, PositionEcsComponent]>,
  spriteQuery: QueryResult<[SpriteEcsComponent, PositionEcsComponent]>,
  textQuery: QueryResult<
    [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
  >,
): number {
  const {
    entities: meshEntities,
    components: [meshes, meshPositions],
  } = meshQuery;
  const {
    entities: spriteEntities,
    components: [sprites, spritePositions],
  } = spriteQuery;
  const {
    entities: textEntities,
    components: [texts, textMeshes, textPositions],
  } = textQuery;
  let count = 0;

  for (let m = 0; m < meshEntities.length; m++) {
    if (resolver.isVisible(meshEntities[m])) {
      const mesh = meshes[m];
      const item = setDrawItem(
        count++,
        meshEntities[m],
        MESH_ITEM_KIND,
        meshPositions[m],
      );

      item.category = mesh.category;
      item.layer = mesh.layer;
      item.mesh = mesh;
    }
  }

  for (let s = 0; s < spriteEntities.length; s++) {
    if (resolver.isVisible(spriteEntities[s])) {
      const sprite = sprites[s];
      const item = setDrawItem(
        count++,
        spriteEntities[s],
        SPRITE_ITEM_KIND,
        spritePositions[s],
      );

      item.category = sprite.category;
      item.layer = sprite.layer;
      item.sprite = sprite;
    }
  }

  for (let t = 0; t < textEntities.length; t++) {
    if (resolver.isVisible(textEntities[t])) {
      const text = texts[t];
      const item = setDrawItem(
        count++,
        textEntities[t],
        TEXT_ITEM_KIND,
        textPositions[t],
      );

      item.category = text.category;
      item.layer = text.layer;
      item.text = text;
      item.textMesh = textMeshes[t];
    }
  }

  return count;
}

function writeSortKeys(resolver: DrawOrderResolver, count: number): void {
  ensureSortCapacity(count);

  for (let i = 0; i < count; i++) {
    const { entity, kind, layer } = drawItems[i];

    const rootSequence = resolver.rootSequence(entity);

    layerKeys[i] = float32ToSortableUint32(layer);
    worldOrderKeys[i] = int32ToSortableUint32(resolver.worldOrder(entity));
    rootSequenceHighKeys[i] = Math.floor(rootSequence / 0x100000000);
    rootSequenceLowKeys[i] = rootSequence >>> 0;
    // An entity's mesh draws before its sprite, which draws before its text.
    hierarchyKeys[i] =
      resolver.hierarchyIndex(entity) * DRAW_ITEM_KIND_COUNT + kind;
  }
}

// Only needed when a camera y-sorts, so only written then.
function writeRootYSortKeys(resolver: DrawOrderResolver, count: number): void {
  for (let i = 0; i < count; i++) {
    // Ascending, so a higher Y (further down the screen) draws later, in
    // front.
    writeSortableFloat64(
      resolver.rootY(drawItems[i].entity),
      rootYHighKeys,
      rootYLowKeys,
      i,
    );
  }
}

/**
 * Pushes the commands for one kind of draw item, placed by `transform`.
 */
type PushDrawItemCommands = (
  commands: RenderCommand[],
  item: DrawItem,
  transform: TextTransform,
  optionalComponents: OptionalComponentAccessors,
  renderContext: RenderContext,
  resources: RenderResources,
) => void;

const pushCommandsByKind: Record<DrawItemKind, PushDrawItemCommands> = {
  [MESH_ITEM_KIND]: (commands, item, transform) => {
    const { position, rotation, scale, mask } = transform;

    pushMeshRenderCommand(
      commands,
      item.mesh!,
      position,
      rotation,
      scale,
      mask,
    );
  },
  [SPRITE_ITEM_KIND]: (
    commands,
    item,
    transform,
    optionalComponents,
    renderContext,
    resources,
  ) => {
    const sprite = item.sprite!;

    pushSpriteRenderCommands(
      commands,
      resources.getSpriteRenderable(
        sprite.material ?? renderContext.spriteMaterial,
      ),
      {
        ...transform,
        sprite,
        flip: optionalComponents.getFlip(item.entity),
      },
    );
  },
  [TEXT_ITEM_KIND]: (
    commands,
    item,
    transform,
    _optionalComponents,
    renderContext,
    resources,
  ) => {
    pushTextRenderCommands(
      commands,
      item.text!,
      item.textMesh!,
      resources.getTextRenderables(),
      transform,
      renderContext.pixelRatio,
    );
  },
};

function pushDrawItemCommands(
  commands: RenderCommand[],
  item: DrawItem,
  optionalComponents: OptionalComponentAccessors,
  renderContext: RenderContext,
  resources: RenderResources,
): void {
  const { entity, position } = item;
  const mask = optionalComponents.getMask(entity);

  // Hidden entirely by its masks, so nothing to draw.
  if (mask && !mask.visible) {
    return;
  }

  pushCommandsByKind[item.kind](
    commands,
    item,
    {
      position,
      rotation: optionalComponents.getRotation(entity),
      scale: optionalComponents.getScale(entity),
      mask,
    },
    optionalComponents,
    renderContext,
    resources,
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
 * Creates a render system that draws every camera's meshes, sprites and
 * text in one draw order. Consecutive quads (in draw order) with the same
 * material, texture and emissive map draw in one instanced draw call; each
 * mesh (see `MeshEcsComponent`) is a draw call of its own, which ends the
 * batch before it. Each camera is projected from its view (see
 * `computeCameraView`), and meshes, sprites, nine-slice regions and glyphs
 * whose bounds are outside that view are skipped before anything is
 * uploaded.
 *
 * Meshes, sprites and text hidden in the hierarchy (see
 * `VisibilityEcsComponent`) aren't drawn. The rest draw by `layer`, then by
 * world order (see `DrawOrderEcsComponent`), then, for a camera with
 * `ySort`, by their root entity's Y (lower first, so entities further down
 * the screen draw in front), then in hierarchy order: root entities in
 * creation order, each followed by its subtree in pre-order. That's a total order, resolved and sorted once per frame with
 * an exact radix sort. An entity's mesh draws before its sprite, and its
 * sprite before its text.
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

      const meshQuery = world.query<[MeshEcsComponent, PositionEcsComponent]>([
        meshId,
        positionId,
      ]);
      const spriteQuery = world.query<
        [SpriteEcsComponent, PositionEcsComponent]
      >([spriteId, positionId]);
      const textQuery = world.query<
        [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
      >([textId, textMeshId, positionId]);

      drawOrderResolver.resolve(
        world,
        meshQuery.entities,
        spriteQuery.entities,
        textQuery.entities,
      );

      const itemCount = collectDrawItems(
        drawOrderResolver,
        meshQuery,
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

        drawCommands(renderContext, projectionMatrix, commands);
      }

      renderContext.gl.disable(renderContext.gl.BLEND);
    },
  };
};
