import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import {
  TextHorizontalAlign,
  textHorizontalAlignments,
  TextVerticalAlign,
  textVerticalAlignments,
} from '../types/text-alignment.js';

/**
 * The default rendering category a text entity's glyphs are drawn with when
 * `TextEcsComponent.category` isn't overridden, matched against each
 * camera's `cullingMask`. The same default as `SpriteEcsComponent.category`.
 * Not reserved or forced - it's a default like any other.
 */
export const TEXT_RENDER_CATEGORY = 1;

/**
 * Fields of {@link TextEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface TextRequiredOptions {
  /** The string to render. */
  text: string;

  /** The loaded font atlas glyphs are drawn from. */
  fontAtlas: FontAtlas;

  /** Font size, in world units - the rendered em height. */
  size: number;
}

/**
 * Fields of {@link TextEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface TextDefaultedOptions {
  /**
   * Multiplies against the atlas's tint (same semantics as
   * `SpriteEcsComponent.tintColor`).
   */
  color: Color;

  /**
   * Extra spacing between adjacent glyphs on a line, in ems: it's
   * multiplied by `size`, so `0.1` at size `20` adds 2 world units between
   * letters, and tracking scales with the text. A word gap gets one letter
   * space on top of the whitespace's own advance, so tracked words stay
   * apart. It's never added after a line's last letter, so it doesn't
   * change how centered or right-aligned text lines up.
   */
  letterSpacing: number;

  /** Multiplier on the font's authored line height. */
  lineHeight: number;

  /**
   * Horizontal alignment of each line within `maxWidth`. Irrelevant, and
   * ignored, when `maxWidth` is unset (a single unwrapped line is always
   * exactly as wide as the block itself, so every mode produces the same
   * result).
   */
  horizontalAlign: TextHorizontalAlign;

  /**
   * Vertical alignment of the shaped block relative to the entity's
   * position. Every mode anchors to the font's metrics (and the line
   * count), never to the glyphs this string contains, so a label doesn't
   * move when its text changes:
   *
   * - `'top'` anchors the first line's ascender (the top of the font's
   *   tallest glyphs), so text hangs below the position.
   * - `'bottom'` anchors the last line's descender, so text sits above it.
   * - `'capline'` anchors the first line's cap height (the top of a capital
   *   like "H"), lower than the ascender of "b"/"d"/"h". Use it to put the
   *   top of a title set in caps exactly on the position.
   * - `'baseline'` anchors the first line's baseline.
   * - `'middle'` centers the band from the first line's cap height to the
   *   last line's baseline on the position, which is where a designer
   *   centers a label in a button. Lowercase descenders hang below the
   *   band.
   */
  verticalAlign: TextVerticalAlign;

  /**
   * Wraps at word boundaries when a line would exceed this width, in world
   * units. `undefined` (the default) never wraps.
   */
  maxWidth?: number;

  /**
   * Where this entity's own local origin sits within the `horizontalAlign`
   * box, as a fraction of `maxWidth` from the box's left edge - `0` (the
   * default) means the entity's local `x = 0` *is* the box's left edge.
   * Set this to match a parent `RectTransformEcsComponent`'s `pivot.x` when
   * that pivot isn't `0`: `createUiLayoutEcsSystem` already does this
   * automatically for any stretch-x-anchored label (see its own doc
   * comment), so most callers never need to set it themselves. See
   * `ShapeTextOptions.horizontalAlignPivot` for the full mechanics.
   */
  horizontalAlignPivot: number;

  /**
   * Whether `<b>` and `<color=...>` tags in `text` are parsed as markup.
   * Set it to `false` for text a player typed, so it's drawn exactly as
   * written, tags included (a text field's label does this).
   */
  richText: boolean;

  /**
   * The draw-order layer for this text, relative to other sprites/text drawn
   * by the same camera. Identical semantics to `SpriteEcsComponent.layer`.
   */
  layer: number;

  /**
   * The render category this text's glyphs are drawn with, matched against
   * each camera's `cullingMask` (the same bitmask-matching
   * `SpriteEcsComponent.category` convention). Defaults to
   * `TEXT_RENDER_CATEGORY`, shared by every text entity that doesn't
   * override it - not a reserved value, just a default: override it per
   * entity when a game needs a specific text entity (e.g. a UI label) under
   * a different camera's culling mask than whatever else already uses the
   * default category.
   */
  category: number;

  /** Whether this text is drawn at all. */
  enabled: boolean;

  /**
   * Outline color. `outlineWidth` of `0` (the default) draws no outline
   * regardless of this value.
   */
  outlineColor: Color;

  /**
   * Outline thickness, in screen-pixel-range units - a fixed number of
   * screen (CSS) pixels regardless of camera zoom or entity scale, the same
   * scale-independent unit the MSDF anti-aliasing band itself uses, scaled
   * by `RenderContext.pixelRatio` so it keeps the same physical thickness
   * on a HiDPI display as on a standard one. Drawn
   * as its own pass, always before every glyph's fill (see
   * `createTextRenderables`), so an outline can safely reach past a
   * same-word neighboring glyph - even merge with that neighbor's own
   * outline - without ever painting over any glyph's fill. Requesting more
   * than the atlas's own encoded `distanceRange` can faithfully represent
   * silently clamps to the widest safe value rather than corrupting glyphs;
   * see `text-effects.md`'s Text Effects guide for the safe range of the
   * font you're using and how to raise it.
   */
  outlineWidth: number;

  /**
   * Soft shadow/glow color. `shadowColor`'s alpha of `0` (the default)
   * draws no shadow regardless of `shadowSoftness`/`shadowOffset`.
   */
  shadowColor: Color;

  /**
   * Offset of the soft shadow/glow from the glyph, in screen-pixel-range
   * units (see `outlineWidth`). Bounded the same way `outlineWidth` is - by
   * the atlas's own encoded `distanceRange` budget - rather than by
   * anything to do with neighboring glyphs.
   */
  shadowOffset: Vector2;

  /**
   * How far, in screen-pixel-range units (see `outlineWidth`), the soft
   * shadow/glow fades out from its offset sample. `0` leaves it exactly as
   * crisp as the glyph itself, just offset. Bounded the same way
   * `shadowOffset` is.
   */
  shadowSoftness: number;
}

export interface TextEcsComponent
  extends TextRequiredOptions, TextDefaultedOptions {
  /**
   * An additional multiplier applied to `color.a` when computing this
   * text's final rendered alpha, on top of (not instead of) the color's
   * own alpha - only its fill, not its `outlineColor`/`shadowColor`
   * effects, currently inherit this. Left `undefined`, this text renders
   * at `color.a` alone. Mirrors `SpriteEcsComponent.opacityMultiplier`
   * exactly, including why it's a separate field from `color.a` itself -
   * see that field's own doc comment.
   */
  opacityMultiplier?: number;
}

export const textId = createComponentId<TextEcsComponent>('text');

/**
 * Attaches a {@link TextEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the text. `text`, `fontAtlas`,
 * and `size` have no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTextComponent(
  world: EcsWorld,
  entity: number,
  options: TextRequiredOptions & Partial<TextEcsComponent>,
): TextEcsComponent {
  const defaultTextOptions: TextDefaultedOptions = {
    color: Color.white,
    letterSpacing: 0,
    lineHeight: 1,
    horizontalAlign: textHorizontalAlignments.left,
    verticalAlign: textVerticalAlignments.top,
    horizontalAlignPivot: 0,
    richText: true,
    layer: 0,
    category: TEXT_RENDER_CATEGORY,
    enabled: true,
    outlineColor: Color.black,
    outlineWidth: 0,
    shadowColor: Color.transparent,
    shadowOffset: { x: 0, y: 0 },
    shadowSoftness: 0,
  };

  const component: TextEcsComponent = {
    ...defaultTextOptions,
    ...options,
  };

  return world.addComponent(entity, textId, component);
}
