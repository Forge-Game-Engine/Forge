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
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/components/index.js';
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
  const { renderable, layer, slices } = spriteComponent;
  const depth = entityPosition.world.y;

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

// Text is expanded into per-glyph, `SpriteEcsComponent`-shaped render
// commands right here, isolated to these two functions, rather than
// generalizing nine-slice's expansion into a shared `SubQuad[]` path (see
// issue #584): every glyph quad needs exactly the same instance data a
// sprite already carries (position, rotation, scale, size, pivot, uv,
// tint), so a glyph can reuse the sprite vertex shader/instancing pipeline
// unchanged by simply constructing a `SpriteEcsComponent` for it, the same
// trick nine-slice regions already use.
function pushTextRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMeshComponent: TextMeshEcsComponent,
  entityPosition: PositionEcsComponent,
  rotationComponent: RotationEcsComponent | null,
  scaleComponent: ScaleEcsComponent | null,
  flipComponent: FlipEcsComponent | null,
): void {
  const { renderable, layer, color } = textComponent;
  const depth = entityPosition.world.y;

  const rotationRadians = rotationComponent?.world ?? 0;
  const scaleX =
    (scaleComponent?.world.x ?? 1) * (flipComponent?.flipX ? -1 : 1);
  const scaleY =
    (scaleComponent?.world.y ?? 1) * (flipComponent?.flipY ? -1 : 1);

  for (const glyph of textMeshComponent.glyphs) {
    const glyphOffset = Vec2.rotate(
      { x: glyph.offset.x * scaleX, y: glyph.offset.y * scaleY },
      rotationRadians,
    );

    const glyphPosition: PositionEcsComponent = {
      local: entityPosition.local,
      // Clone before adding, matching `pushSpriteRenderCommands`: must not
      // mutate the entity's live world position.
      world: Vec2.add(Vec2.clone(entityPosition.world), glyphOffset),
    };

    const glyphSprite: SpriteEcsComponent = {
      enabled: true,
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      tintColor: color,
      renderable,
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      layer,
    };

    commands.push({
      layer,
      depth,
      renderable,
      components: {
        position: glyphPosition,
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: glyphSprite,
        flip: flipComponent,
      },
    });
  }
}

function buildTextCameraCommands(
  world: EcsWorld,
  texts: TextEcsComponent[],
  textMeshes: TextMeshEcsComponent[],
  textPositions: PositionEcsComponent[],
  textEntities: readonly number[],
  cullingMask: number,
  commands: RenderCommand[],
): void {
  for (let t = 0; t < textEntities.length; t++) {
    const textComponent = texts[t];

    if (!textComponent.enabled) {
      continue;
    }

    if (!matchesMask(textComponent.renderable.category, cullingMask)) {
      continue;
    }

    const textEntity = textEntities[t];
    const entityPosition = textPositions[t];

    pushTextRenderCommands(
      commands,
      textComponent,
      textMeshes[t],
      entityPosition,
      world.getComponent<RotationEcsComponent>(textEntity, rotationId),
      world.getComponent<ScaleEcsComponent>(textEntity, scaleId),
      world.getComponent<FlipEcsComponent>(textEntity, flipId),
    );
  }
}

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
      components: [texts, textMeshes, textPositions],
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
        texts,
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

      commands.sort((a, b) =>
        a.layer !== b.layer ? a.layer - b.layer : a.depth - b.depth,
      );

      flushBatches(renderContext, projectionMatrix, commands);
    }

    renderContext.gl.disable(renderContext.gl.BLEND);
  },
});
