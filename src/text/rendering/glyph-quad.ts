import {
  PositionEcsComponent,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';
import { SpriteEcsComponent } from '../../rendering/components/sprite-component.js';
import { RenderCommand } from '../../rendering/render-command.js';
import { TextEffectsInstanceData } from '../../rendering/renderable.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import { TextEcsComponent } from '../components/text-component.js';
import {
  GlyphQuad,
  TextMeshEcsComponent,
} from '../components/text-mesh-component.js';

/**
 * Builds the glyph-centered position offset from `entityPosition` shared by
 * a glyph's effects and fill commands.
 * @param entityPosition - The text entity's position.
 * @param glyph - The glyph to offset from it.
 * @returns The glyph's own position.
 */
function buildGlyphPosition(
  entityPosition: PositionEcsComponent,
  glyph: GlyphQuad,
): PositionEcsComponent {
  return {
    local: entityPosition.local,
    world: Vec2.add(Vec2.clone(entityPosition.world), glyph.offset),
  };
}

/**
 * Pushes one `RenderCommand` per visible glyph in `textMesh` for the
 * outline/shadow ("effects") pass, generalizing the sub-quad expansion
 * `render-system.ts`'s `pushSpriteRenderCommands` already does for
 * nine-slice sprites: each `GlyphQuad` is wrapped in a synthetic
 * `SpriteEcsComponent`-shaped object (centered via `pivot: (0.5, 0.5)`) so
 * glyphs reuse the exact same `bindSpriteInstanceData`/
 * `setupSpriteInstanceAttributes` machinery sprites and nine-slice regions
 * already batch through.
 * @param commands - The render command buffer to push into.
 * @param textComponent - The entity's `TextEcsComponent` (for `layer` and effect fields).
 * @param textMesh - The entity's shaped glyph quads to push commands for.
 * @param entityPosition - The entity's position; each glyph is offset from it.
 * @param rotationComponent - The entity's rotation, if it has one.
 * @param scaleComponent - The entity's scale, if it has one.
 */
function pushTextEffectsRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  entityPosition: PositionEcsComponent,
  rotationComponent: RotationEcsComponent | null,
  scaleComponent: ScaleEcsComponent | null,
): void {
  const { effectsRenderable } = textMesh;
  const {
    layer,
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowOffset,
    shadowSoftness,
  } = textComponent;
  const depth = textComponent.sortDepth ?? entityPosition.world.y;

  // Uniform across every glyph in this entity, so built once rather than
  // per glyph.
  const textEffects: TextEffectsInstanceData = {
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowOffset,
    shadowSoftness,
  };

  for (const glyph of textMesh.glyphs) {
    const glyphSprite: SpriteEcsComponent = {
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      // `msdf-effects.frag` doesn't read `v_tint` at all - the ring/shadow
      // colors it actually draws with come from `textEffects` below - but
      // `SpriteEcsComponent.tintColor` still has to be a `Color`.
      tintColor: outlineColor,
      renderable: effectsRenderable,
      enabled: true,
      layer,
    };

    commands.push({
      layer,
      depth,
      renderable: effectsRenderable,
      components: {
        position: buildGlyphPosition(entityPosition, glyph),
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: glyphSprite,
        flip: null,
        textEffects,
      },
    });
  }
}

/**
 * Pushes one `RenderCommand` per visible glyph in `textMesh` for the fill
 * pass, always after every glyph's effects commands for the same text
 * entity (see `pushTextRenderCommands`) so a glyph's fill can never be
 * painted over by a neighboring glyph's outline/shadow.
 * @param commands - The render command buffer to push into.
 * @param textComponent - The entity's `TextEcsComponent` (for `layer` and `color`).
 * @param textMesh - The entity's shaped glyph quads to push commands for.
 * @param entityPosition - The entity's position; each glyph is offset from it.
 * @param rotationComponent - The entity's rotation, if it has one.
 * @param scaleComponent - The entity's scale, if it has one.
 */
function pushTextFillRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  entityPosition: PositionEcsComponent,
  rotationComponent: RotationEcsComponent | null,
  scaleComponent: ScaleEcsComponent | null,
): void {
  const { fillRenderable } = textMesh;
  const { layer, color } = textComponent;
  const depth = textComponent.sortDepth ?? entityPosition.world.y;

  for (const glyph of textMesh.glyphs) {
    const glyphSprite: SpriteEcsComponent = {
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      tintColor: color,
      renderable: fillRenderable,
      enabled: true,
      layer,
    };

    commands.push({
      layer,
      depth,
      renderable: fillRenderable,
      components: {
        position: buildGlyphPosition(entityPosition, glyph),
        rotation: rotationComponent,
        scale: scaleComponent,
        sprite: glyphSprite,
        flip: null,
      },
    });
  }
}

/**
 * Pushes the render commands for every visible glyph in `textMesh`, as two
 * ordered passes: outline/shadow ("effects") first, then fill - see
 * `createTextRenderable`'s doc comment for why. The effects pass is skipped
 * entirely when neither an outline nor a shadow is actually configured (the
 * common case), so plain text costs exactly what it did before this split.
 * Both passes share the same `layer`/`depth` per glyph, so the render
 * system's stable sort-by-`(layer, depth)` preserves this push order,
 * keeping every glyph's fill drawn after every glyph's effects for this
 * entity.
 * @param commands - The render command buffer to push into.
 * @param textComponent - The entity's `TextEcsComponent` (for `layer`, `color`, and effect fields).
 * @param textMesh - The entity's shaped glyph quads to push commands for.
 * @param entityPosition - The entity's position; each glyph is offset from it.
 * @param rotationComponent - The entity's rotation, if it has one.
 * @param scaleComponent - The entity's scale, if it has one.
 */
export function pushTextRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  entityPosition: PositionEcsComponent,
  rotationComponent: RotationEcsComponent | null,
  scaleComponent: ScaleEcsComponent | null,
): void {
  const { outlineWidth, shadowColor } = textComponent;
  const hasEffects = outlineWidth > 0 || shadowColor.a > 0;

  if (hasEffects) {
    pushTextEffectsRenderCommands(
      commands,
      textComponent,
      textMesh,
      entityPosition,
      rotationComponent,
      scaleComponent,
    );
  }

  pushTextFillRenderCommands(
    commands,
    textComponent,
    textMesh,
    entityPosition,
    rotationComponent,
    scaleComponent,
  );
}

/**
 * Builds render commands for every visible text entity a camera should
 * draw, mirroring `render-system.ts`'s own `buildCameraCommands` for
 * sprites: skips disabled text and text whose mesh renderable category
 * doesn't match `cullingMask`, then delegates to `pushTextRenderCommands`.
 * @param world - The ECS world, used to look up each entity's optional
 * rotation/scale components.
 * @param textComponents - Each queried entity's `TextEcsComponent`.
 * @param textMeshes - Each queried entity's `TextMeshEcsComponent`.
 * @param textPositions - Each queried entity's `PositionEcsComponent`.
 * @param textEntities - The queried entity ids, parallel to the arrays above.
 * @param cullingMask - The camera's culling mask.
 * @param commands - The render command buffer to push into.
 */
export function buildTextCameraCommands(
  world: EcsWorld,
  textComponents: TextEcsComponent[],
  textMeshes: TextMeshEcsComponent[],
  textPositions: PositionEcsComponent[],
  textEntities: readonly number[],
  cullingMask: number,
  commands: RenderCommand[],
): void {
  for (let t = 0; t < textEntities.length; t++) {
    const textComponent = textComponents[t];

    if (!textComponent.enabled) {
      continue;
    }

    const textMesh = textMeshes[t];

    // Both renderables always share one category (see
    // `createTextRenderable`'s `TEXT_RENDER_CATEGORY`), so checking either
    // one is sufficient.
    if (!matchesMask(textMesh.fillRenderable.category, cullingMask)) {
      continue;
    }

    const textEntity = textEntities[t];
    const entityPosition = textPositions[t];

    pushTextRenderCommands(
      commands,
      textComponent,
      textMesh,
      entityPosition,
      world.getComponent<RotationEcsComponent>(textEntity, rotationId),
      world.getComponent<ScaleEcsComponent>(textEntity, scaleId),
    );
  }
}
