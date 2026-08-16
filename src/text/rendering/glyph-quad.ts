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
import { TextMeshEcsComponent } from '../components/text-mesh-component.js';

/**
 * Pushes one `RenderCommand` per visible glyph in `textMesh`, generalizing
 * the sub-quad expansion `render-system.ts`'s `pushSpriteRenderCommands`
 * already does for nine-slice sprites: each `GlyphQuad` is wrapped in a
 * synthetic `SpriteEcsComponent`-shaped object (centered via
 * `pivot: (0.5, 0.5)`) so glyphs reuse the exact same
 * `bindSpriteInstanceData`/`setupSpriteInstanceAttributes` machinery sprites
 * and nine-slice regions already batch through.
 * @param commands - The render command buffer to push into.
 * @param textComponent - The entity's `TextEcsComponent` (for `layer` and `color`).
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
  const { renderable } = textMesh;
  const {
    layer,
    color,
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowOffset,
    shadowSoftness,
  } = textComponent;
  const depth = entityPosition.world.y;

  for (const glyph of textMesh.glyphs) {
    // Built per glyph, not once per entity: `maxEffectClearance` is the one
    // field here that varies glyph-to-glyph (each glyph's own kerned
    // distance to its neighbors, computed at shape time - see
    // `GlyphQuad.effectClearance`), so the whole object can't be hoisted
    // out of this loop the way a plain sprite's tint color could be.
    const textEffects: TextEffectsInstanceData = {
      outlineColor,
      outlineWidth,
      shadowColor,
      shadowOffset,
      shadowSoftness,
      maxEffectClearance: glyph.effectClearance,
    };

    const glyphPosition: PositionEcsComponent = {
      local: entityPosition.local,
      world: Vec2.add(Vec2.clone(entityPosition.world), glyph.offset),
    };

    const glyphSprite: SpriteEcsComponent = {
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      tintColor: color,
      renderable,
      enabled: true,
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
        flip: null,
        textEffects,
      },
    });
  }
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

    if (!matchesMask(textMesh.renderable.category, cullingMask)) {
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
