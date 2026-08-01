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
import { Matrix3x3, Vector2 } from '../../math/index.js';
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

const centeredPivot = new Vector2(0.5, 0.5);

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
    const regionOffset = new Vector2(
      region.offset.x * scaleX,
      region.offset.y * scaleY,
    ).rotate(rotationRadians);

    const regionPosition: PositionEcsComponent = {
      local: entityPosition.local,
      world: entityPosition.world.add(regionOffset),
    };

    const regionSprite: SpriteEcsComponent = {
      ...spriteComponent,
      width: region.size.x,
      height: region.size.y,
      pivot: centeredPivot,
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
