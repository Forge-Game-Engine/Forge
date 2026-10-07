import {
  PositionEcsComponent,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
} from '../../common/index.js';
import { EcsWorld, QueryResult } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';
import { SpriteEcsComponent } from '../../rendering/components/sprite-component.js';
import { RenderCommand } from '../../rendering/render-command.js';
import { TextEffectsInstanceData } from '../../rendering/renderable.js';
import type {
  InstanceMask,
  InstanceMaskResolver,
} from '../../rendering/utilities/resolve-instance-mask.js';
import type { TextRenderables } from './create-text-renderables.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import { TextEcsComponent } from '../components/text-component.js';
import {
  GlyphQuad,
  TextMeshEcsComponent,
} from '../components/text-mesh-component.js';

/**
 * The transform a text entity's glyphs are placed with.
 */
export interface TextTransform {
  /** The entity's position; each glyph is offset from it. */
  position: PositionEcsComponent;

  /** The entity's rotation, if it has one. */
  rotation: RotationEcsComponent | null;

  /** The entity's scale, if it has one. */
  scale: ScaleEcsComponent | null;

  /** The masks the entity's glyphs are drawn through, or `null` for none. */
  mask: InstanceMask | null;
}

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
 * @param renderables - The renderables glyphs draw with (see `createTextRenderables`).
 * @param transform - The entity's position (each glyph is offset from it), rotation and scale.
 * @param pixelRatio - Device pixels per CSS pixel the destination is rendered at (see `RenderContext.pixelRatio`).
 */
function pushTextEffectsRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  renderables: TextRenderables,
  transform: TextTransform,
  pixelRatio: number,
): void {
  const { effectsRenderable } = renderables;
  const {
    layer,
    category,
    fontAtlas,
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowOffset,
    shadowSoftness,
  } = textComponent;
  const { position: entityPosition, rotation, scale, mask } = transform;
  const depth = textComponent.sortDepth ?? entityPosition.world.y;

  // Uniform across every glyph in this entity, so built once rather than
  // per glyph. The effect sizes are authored in CSS pixels but the shader
  // measures them in the destination's own (device) pixels, so they're
  // scaled up by the pixel ratio to keep the same physical size on a HiDPI
  // display as on a standard one.
  const textEffects: TextEffectsInstanceData = {
    outlineColor,
    outlineWidth: outlineWidth * pixelRatio,
    shadowColor,
    shadowOffset: Vec2.multiply(Vec2.clone(shadowOffset), pixelRatio),
    shadowSoftness: shadowSoftness * pixelRatio,
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
      texture: fontAtlas.texture,
      emissive: null,
      material: null,
      category,
      enabled: true,
      layer,
    };

    commands.push({
      layer,
      depth,
      renderable: effectsRenderable,
      texture: fontAtlas.texture,
      emissiveTexture: null,
      fontAtlas,
      components: {
        position: buildGlyphPosition(entityPosition, glyph),
        rotation,
        scale,
        sprite: glyphSprite,
        flip: null,
        mask,
        textEffects,
        textEmbolden: glyph.embolden,
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
 * @param textComponent - The entity's `TextEcsComponent` (for `layer`, and `color` for glyphs outside a `<color>` tag).
 * @param textMesh - The entity's shaped glyph quads to push commands for.
 * @param renderables - The renderables glyphs draw with (see `createTextRenderables`).
 * @param transform - The entity's position (each glyph is offset from it), rotation and scale.
 */
function pushTextFillRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  renderables: TextRenderables,
  transform: TextTransform,
): void {
  const { fillRenderable } = renderables;
  const { layer, category, fontAtlas, color } = textComponent;
  const { position: entityPosition, rotation, scale, mask } = transform;
  const depth = textComponent.sortDepth ?? entityPosition.world.y;

  for (const glyph of textMesh.glyphs) {
    const glyphSprite: SpriteEcsComponent = {
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      tintColor: glyph.color ?? color,
      opacityMultiplier: textComponent.opacityMultiplier,
      texture: fontAtlas.texture,
      emissive: null,
      material: null,
      category,
      enabled: true,
      layer,
    };

    commands.push({
      layer,
      depth,
      renderable: fillRenderable,
      texture: fontAtlas.texture,
      emissiveTexture: null,
      fontAtlas,
      components: {
        position: buildGlyphPosition(entityPosition, glyph),
        rotation,
        scale,
        sprite: glyphSprite,
        flip: null,
        mask,
        textEmbolden: glyph.embolden,
      },
    });
  }
}

/**
 * Pushes the render commands for every visible glyph in `textMesh`, as two
 * ordered passes: outline/shadow ("effects") first, then fill - see
 * `createTextRenderables`' doc comment for why. The effects pass is skipped
 * entirely when neither an outline nor a shadow is actually configured (the
 * common case), so plain text costs exactly what it did before this split.
 * Both passes share the same `layer`/`depth` per glyph, so the render
 * system's stable sort-by-`(layer, depth)` preserves this push order,
 * keeping every glyph's fill drawn after every glyph's effects for this
 * entity.
 * @param commands - The render command buffer to push into.
 * @param textComponent - The entity's `TextEcsComponent` (for `layer`, `color`, and effect fields).
 * @param textMesh - The entity's shaped glyph quads to push commands for.
 * @param renderables - The renderables glyphs draw with (see `createTextRenderables`).
 * @param transform - The entity's position (each glyph is offset from it), rotation and scale.
 * @param pixelRatio - Device pixels per CSS pixel the destination is rendered at (see `RenderContext.pixelRatio`), which the outline/shadow sizes are scaled by (default: 1).
 */
export function pushTextRenderCommands(
  commands: RenderCommand[],
  textComponent: TextEcsComponent,
  textMesh: TextMeshEcsComponent,
  renderables: TextRenderables,
  transform: TextTransform,
  pixelRatio: number = 1,
): void {
  const { outlineWidth, shadowColor } = textComponent;
  const hasEffects = outlineWidth > 0 || shadowColor.a > 0;

  if (hasEffects) {
    pushTextEffectsRenderCommands(
      commands,
      textComponent,
      textMesh,
      renderables,
      transform,
      pixelRatio,
    );
  }

  pushTextFillRenderCommands(
    commands,
    textComponent,
    textMesh,
    renderables,
    transform,
  );
}

/**
 * Builds render commands for every visible text entity a camera should
 * draw, mirroring `render-system.ts`'s own `buildCameraCommands` for
 * sprites: skips disabled text and text whose `category` doesn't match
 * `cullingMask`, then delegates to `pushTextRenderCommands`.
 * @param world - The ECS world, used to look up each entity's optional
 * rotation/scale components.
 * @param textQuery - The text entities to draw, and each one's
 * `TextEcsComponent`, `TextMeshEcsComponent` and `PositionEcsComponent`.
 * @param cullingMask - The camera's culling mask.
 * @param commands - The render command buffer to push into.
 * @param getRenderables - Returns the renderables glyphs draw with; only
 * called when there's text to draw.
 * @param getMask - Returns the masks an entity's glyphs are drawn through;
 * text hidden entirely by its masks is skipped.
 * @param pixelRatio - Device pixels per CSS pixel the destination is rendered at (see `RenderContext.pixelRatio`), which the outline/shadow sizes are scaled by (default: 1).
 */
export function buildTextCameraCommands(
  world: EcsWorld,
  textQuery: QueryResult<
    [TextEcsComponent, TextMeshEcsComponent, PositionEcsComponent]
  >,
  cullingMask: number,
  commands: RenderCommand[],
  getRenderables: () => TextRenderables,
  getMask: InstanceMaskResolver,
  pixelRatio: number = 1,
): void {
  const {
    entities: textEntities,
    components: [textComponents, textMeshes, textPositions],
  } = textQuery;

  for (let t = 0; t < textEntities.length; t++) {
    const textComponent = textComponents[t];

    if (!textComponent.enabled) {
      continue;
    }

    if (!matchesMask(textComponent.category, cullingMask)) {
      continue;
    }

    const textMesh = textMeshes[t];

    const textEntity = textEntities[t];
    const entityPosition = textPositions[t];
    const mask = getMask(textEntity);

    if (mask && !mask.visible) {
      continue;
    }

    pushTextRenderCommands(
      commands,
      textComponent,
      textMesh,
      getRenderables(),
      {
        position: entityPosition,
        rotation: world.getComponent<RotationEcsComponent>(
          textEntity,
          rotationId,
        ),
        scale: world.getComponent<ScaleEcsComponent>(textEntity, scaleId),
        mask,
      },
      pixelRatio,
    );
  }
}
