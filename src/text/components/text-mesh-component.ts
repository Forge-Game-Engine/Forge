import { createComponentId } from '../../ecs/ecs-component.js';
import type { Vector2 } from '../../math/index.js';
import type { Renderable } from '../../rendering/renderable.js';

/**
 * A single shaped glyph's quad: structurally identical to a
 * `NineSliceRegion` (an offset, a size, and a UV rect into an atlas
 * texture), so it can be pushed through the same render-command machinery
 * (see `pushTextRenderCommands` in `render-system.ts`).
 */
export interface GlyphQuad {
  /**
   * This glyph's center, as an offset from the text block's anchor point, in
   * world units, Y-up.
   */
  offset: Vector2;

  /** This glyph's rendered size, in world units. */
  size: Vector2;

  /** The top-left corner of this glyph's texture rect in the atlas, 0 to 1. */
  uvOffset: Vector2;

  /** The width/height of this glyph's texture rect in the atlas, 0 to 1. */
  uvScale: Vector2;
}

/**
 * The shaped, GPU-ready output of a `TextEcsComponent`: one quad per visible
 * (non-whitespace, in-charset) glyph, plus the shaped block's own bounds.
 *
 * System-owned: written only by `createTextShapingEcsSystem`, attached
 * lazily the first time it shapes an entity's `TextEcsComponent`. Never
 * construct or mutate this directly.
 */
export interface TextMeshEcsComponent {
  /** One entry per visible glyph. */
  readonly glyphs: readonly GlyphQuad[];

  /**
   * The shaped block's own bounds, in world units, for layout callers (e.g.
   * a future UI content-size fitter).
   */
  readonly bounds: { width: number; height: number };

  /**
   * The `FontAtlas`-backed `Renderable` these glyphs' fill draws with. See
   * `createTextRenderable`'s doc comment for why fill and effects are two
   * separate, ordered `Renderable`s rather than one.
   */
  readonly fillRenderable: Renderable;

  /**
   * The `FontAtlas`-backed `Renderable` these glyphs' outline/shadow draws
   * with.
   */
  readonly effectsRenderable: Renderable;
}

export const textMeshId = createComponentId<TextMeshEcsComponent>('textMesh');
