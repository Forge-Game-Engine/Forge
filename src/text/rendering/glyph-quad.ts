import {
  PositionEcsComponent,
  RotationEcsComponent,
  ScaleEcsComponent,
} from '../../common/index.js';
import { Vec2 } from '../../math/index.js';
import { SpriteEcsComponent } from '../../rendering/components/sprite-component.js';
import { RenderCommand } from '../../rendering/render-command.js';
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
  const { layer, color } = textComponent;
  const depth = entityPosition.world.y;

  for (const glyph of textMesh.glyphs) {
    const glyphPosition: PositionEcsComponent = {
      local: entityPosition.local,
      // Clone before adding, matching `pushSpriteRenderCommands`'s own
      // region offset: `entityPosition.world` is the entity's live world
      // position and must not be mutated by this glyph's offset.
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
      },
    });
  }
}
