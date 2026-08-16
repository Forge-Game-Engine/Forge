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

  /**
   * How far, in world units, an outline/shadow effect can safely extend from
   * this glyph's own edge before it would touch a neighboring glyph's quad -
   * half the gap to the tighter of this glyph's left/right in-word
   * neighbors (see `shapeWord` in `shape-text.ts`), or a large sentinel when
   * there's no relevant neighbor (start/end of a word). Consumed by the MSDF
   * fragment shader, converted to screen-pixel-range units there, so that
   * `TextEcsComponent.outlineWidth`/`shadowSoftness` can never paint one
   * glyph's effect over an adjacent glyph's - the effect degrades to
   * whatever this glyph's own layout can safely fit, rather than
   * overlapping. Effects across a word boundary (separated by at least one
   * whitespace advance) are not constrained by this value; see
   * `shape-text.ts` for why that's a deliberate scope decision, not an
   * oversight.
   */
  effectClearance: number;
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

  /** The `FontAtlas`-backed `Renderable` these glyphs draw with. */
  readonly renderable: Renderable;
}

export const textMeshId = createComponentId<TextMeshEcsComponent>('textMesh');
