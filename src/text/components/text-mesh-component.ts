import { FontAtlas } from '../../asset-loading/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { TextAlignment } from './text-component.js';

/**
 * A single glyph's quad, in a text block's own local text-space, that the
 * render system draws for each character `createTextShapingEcsSystem`
 * placed. Mirrors `NineSliceRegion` (`/rendering`) - the same "offset +
 * size + uv rect" shape the render system already knows how to expand into
 * a `SpriteEcsComponent`-shaped render command.
 */
export interface GlyphQuad {
  /**
   * This glyph's center, as an offset from the text block's pivot-adjusted
   * anchor point, in unscaled local units (before rotation and
   * `ScaleEcsComponent` are applied).
   */
  offset: Vector2;

  /** This glyph's rendered width/height, in the same unscaled units. */
  size: Vector2;

  /** The top-left corner of this glyph's region in the font atlas, 0 to 1. */
  uvOffset: Vector2;

  /** The width/height of this glyph's region in the font atlas, 0 to 1. */
  uvScale: Vector2;
}

/**
 * The shaped glyph quads produced by `createTextShapingEcsSystem` from a
 * `TextEcsComponent`. Added and kept up to date automatically - shaping a
 * paragraph is real cost, so this only happens when `TextEcsComponent`'s
 * shape-affecting fields actually change (dirty-tracked via the `source*`
 * fields below), not every frame.
 */
export interface TextMeshEcsComponent {
  /**
   * This text block's shaped glyph quads, one per visible (non-whitespace)
   * character.
   */
  glyphs: GlyphQuad[];

  /**
   * This text block's overall size (the widest line's width, and the full
   * stack of lines' height), in world units. Reflects `pivot`'s effect on
   * `glyphs`' offsets, not just the raw shaped size.
   */
  bounds: Vector2;

  /**
   * The `TextEcsComponent.text` this mesh was last shaped from, used by
   * `createTextShapingEcsSystem` to detect when re-shaping is needed.
   */
  sourceText: string;

  /** The `TextEcsComponent.font` this mesh was last shaped from. */
  sourceFont: FontAtlas;

  /** The `TextEcsComponent.fontSize` this mesh was last shaped from. */
  sourceFontSize: number;

  /** The `TextEcsComponent.wrapWidth` this mesh was last shaped from. */
  sourceWrapWidth: number | undefined;

  /** The `TextEcsComponent.lineSpacing` this mesh was last shaped from. */
  sourceLineSpacing: number;

  /** The `TextEcsComponent.alignment` this mesh was last shaped from. */
  sourceAlignment: TextAlignment;

  /** The `TextEcsComponent.pivot` this mesh was last shaped from. */
  sourcePivot: Vector2;
}

export const textMeshId = createComponentId<TextMeshEcsComponent>('textMesh');

/**
 * Attaches a {@link TextMeshEcsComponent} to `entity`. Normally managed
 * automatically by `createTextShapingEcsSystem` - call this directly only
 * when hand-authoring shaped glyph data outside of that system.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The shaped text mesh data.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTextMeshComponent(
  world: EcsWorld,
  entity: number,
  options: TextMeshEcsComponent,
): TextMeshEcsComponent {
  return world.addComponent(entity, textMeshId, options);
}
