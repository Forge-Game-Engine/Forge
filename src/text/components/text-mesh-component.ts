import { createComponentId } from '../../ecs/ecs-component.js';
import type { Vector2 } from '../../math/index.js';
import type { Color } from '../../rendering/color.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import type { TextEcsComponent } from './text-component.js';

/**
 * A single shaped glyph's quad: structurally identical to a
 * `NineSliceRegion` (an offset, a size, and a UV rect into an atlas
 * texture), so it can be pushed through the same render-command machinery
 * (see `pushTextRenderCommands` in `glyph-quad.ts`).
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
   * This glyph's fill color from a `<color=...>` rich text tag, replacing
   * `TextEcsComponent.color` (alpha included). `undefined` outside a
   * `<color>` tag, where the glyph draws in `TextEcsComponent.color`.
   */
  color?: Color;

  /**
   * How far this glyph's ink is thickened by a `<b>` rich text tag (faux
   * bold), as a shift of the distance field's edge threshold in the
   * field's own units (`0.5` is the field's full encoded range). `0` for
   * regular-weight glyphs.
   */
  embolden: number;
}

/**
 * The `TextEcsComponent` fields a text mesh's shape depends on, as they
 * were when it was shaped. `color`, `layer`, `category` and `enabled`
 * change how or whether the mesh is drawn, not its shape, so they aren't
 * included.
 */
export interface TextShapeInputs {
  readonly text: string;
  readonly fontAtlas: FontAtlas;
  readonly size: number;
  readonly letterSpacing: number;
  readonly lineHeight: number;
  readonly horizontalAlign: TextEcsComponent['horizontalAlign'];
  readonly verticalAlign: TextEcsComponent['verticalAlign'];
  readonly maxWidth: number | undefined;
  readonly horizontalAlignPivot: number;
  readonly richText: boolean;
}

/**
 * The shaped output of a `TextEcsComponent`: one quad per visible
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
   * The shaped block's own bounds, in world units, for layout callers such
   * as a UI content size fitter.
   */
  readonly bounds: { width: number; height: number };

  /**
   * Where a caret sits at every UTF-16 boundary of the shaped text (see
   * `ShapedText.caretStops`): `text.length + 1` positions, each an offset
   * from the text's anchor in world units, its y on the line's baseline.
   * Used to draw a text field's caret and selection.
   */
  readonly caretStops: readonly Vector2[];

  /**
   * The text fields this mesh was shaped from. The shaping system shapes
   * the text again when any of them differs from the `TextEcsComponent`'s,
   * or when this is `null`.
   */
  readonly shapedFrom: TextShapeInputs | null;
}

export const textMeshId = createComponentId<TextMeshEcsComponent>('textMesh');
