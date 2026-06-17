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
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';
import { createUiProjectionMatrix } from '../utilities/create-ui-projection-matrix.js';
import { ShapedText, shapeText } from './shape-text.js';
import { TextGlyphInstanceComponents } from './text-instance-layout.js';
import { UiTextEcsComponent, uiTextId } from './ui-text-ecs-component.js';

const textEntityBuffer: number[] = [];

const glyphBatches: Map<
  Renderable<TextGlyphInstanceComponents>,
  InstanceBatch<TextGlyphInstanceComponents>
> = new Map();

const getTextEntityZIndex = (world: EcsWorld, entityId: number): number => {
  const t = world.getComponent<UiTextEcsComponent>(entityId, uiTextId);

  return t?.zIndex ?? 0;
};

const flushGlyphBatch = (
  renderable: Renderable<TextGlyphInstanceComponents>,
  batch: InstanceBatch<TextGlyphInstanceComponents>,
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

const flushIfRenderableChanged = (
  current: Renderable<TextGlyphInstanceComponents> | null,
  next: Renderable<TextGlyphInstanceComponents>,
  renderContext: RenderContext,
  projectionMatrix: Matrix3x3,
): void => {
  if (current === null || current === next) {
    return;
  }

  const batch = glyphBatches.get(current);

  if (batch) {
    flushGlyphBatch(current, batch, renderContext, projectionMatrix);
  }
};

const reshapeIfNeeded = (
  textComponent: UiTextEcsComponent,
  transform: UiTransformEcsComponent,
): void => {
  if (!textComponent.dirty && textComponent.shapedCache) {
    return;
  }

  const { size } = transform.resolvedRect;

  textComponent.shapedCache = shapeText(
    textComponent.text,
    textComponent.font,
    {
      fontSize: textComponent.fontSize,
      align: textComponent.align,
      verticalAlign: textComponent.verticalAlign,
      wrap: textComponent.wrap,
      overflow: textComponent.overflow,
      maxWidth: size.x > 0 ? size.x : undefined,
      maxHeight: size.y > 0 ? size.y : undefined,
    },
  );

  textComponent.dirty = false;
};

const pushGlyphsToBatch = (
  batch: InstanceBatch<TextGlyphInstanceComponents>,
  shaped: ShapedText,
  transform: UiTransformEcsComponent,
  textComponent: UiTextEcsComponent,
): void => {
  const { resolvedRect, worldMatrix, clipRect } = transform;
  const elemW = resolvedRect.size.x;
  const elemH = resolvedRect.size.y;
  const { color, opacity } = textComponent;

  for (const glyph of shaped.glyphs) {
    batch.entries.push({
      worldMatrix,
      glyphOffsetNormX: glyph.x / elemW,
      glyphOffsetNormY: glyph.y / elemH,
      glyphSizeNormX: glyph.width / elemW,
      glyphSizeNormY: glyph.height / elemH,
      uvMinX: glyph.uvRect.x,
      uvMinY: glyph.uvRect.y,
      uvSizeX: glyph.uvRect.w,
      uvSizeY: glyph.uvRect.h,
      colorR: color.r,
      colorG: color.g,
      colorB: color.b,
      colorA: color.a,
      clipRect: clipRect ?? null,
      opacity,
    });
  }
};

const getOrCreateBatch = (
  renderable: Renderable<TextGlyphInstanceComponents>,
): InstanceBatch<TextGlyphInstanceComponents> => {
  let batch = glyphBatches.get(renderable);

  if (!batch) {
    batch = new InstanceBatch<TextGlyphInstanceComponents>();
    glyphBatches.set(renderable, batch);
  }

  return batch;
};

/**
 * Creates the UI text ECS system.
 *
 * The system:
 * - Queries canvas entities (runs once per canvas each frame).
 * - Collects all text entities in `beforeQuery`.
 * - Sorts text entities by `zIndex` (ascending = further back).
 * - Re-shapes text only for entities whose `dirty` flag is set.
 * - Groups consecutive entities sharing the same `Renderable` into instanced
 *   draw calls (one draw call per font/atlas in use).
 *
 * Register after {@link createUiRenderEcsSystem} so text draws on top of
 * panel backgrounds at the same `zIndex`.
 *
 * @param renderContext - The WebGL render context.
 * @returns The UI text ECS system.
 */
export const createUiTextEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[UiCanvasEcsComponent], void> => ({
  query: [uiCanvasId],

  beforeQuery: (world: EcsWorld) => {
    world.queryEntities([uiTextId, uiTransformId], textEntityBuffer);
  },

  run: (_result, world) => {
    const { gl } = renderContext;

    const projectionMatrix = createUiProjectionMatrix(
      gl.canvas.width,
      gl.canvas.height,
    );

    textEntityBuffer.sort(
      (a, b) => getTextEntityZIndex(world, a) - getTextEntityZIndex(world, b),
    );

    for (const batch of glyphBatches.values()) {
      batch.entries.length = 0;
    }

    let currentRenderable: Renderable<TextGlyphInstanceComponents> | null =
      null;

    for (const entityId of textEntityBuffer) {
      const textComponent = world.getComponent<UiTextEcsComponent>(
        entityId,
        uiTextId,
      );

      if (!textComponent?.enabled) {
        continue;
      }

      const transform = world.getComponent<UiTransformEcsComponent>(
        entityId,
        uiTransformId,
      );

      if (!transform) {
        continue;
      }

      reshapeIfNeeded(textComponent, transform);

      const shaped = textComponent.shapedCache;

      if (!shaped || shaped.glyphs.length === 0) {
        continue;
      }

      const { resolvedRect } = transform;

      if (resolvedRect.size.x <= 0 || resolvedRect.size.y <= 0) {
        continue;
      }

      flushIfRenderableChanged(
        currentRenderable,
        textComponent.renderable,
        renderContext,
        projectionMatrix,
      );

      currentRenderable = textComponent.renderable;

      pushGlyphsToBatch(
        getOrCreateBatch(textComponent.renderable),
        shaped,
        transform,
        textComponent,
      );
    }

    if (currentRenderable !== null) {
      const lastBatch = glyphBatches.get(currentRenderable);

      if (lastBatch) {
        flushGlyphBatch(
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
