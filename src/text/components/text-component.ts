import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';

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
   * Extra spacing between glyphs, in world units, added to each glyph's
   * advance.
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
  horizontalAlign: 'left' | 'center' | 'right' | 'justify';

  /**
   * Vertical alignment of the shaped block's visible ink relative to the
   * entity's position - not the font's line-height box, which typically
   * doesn't match the ink's own extent.
   *
   * `'top'`, `'bottom'`, `'capline'`, and `'baseline'` all anchor to a
   * fixed reference that doesn't depend on this specific string's rendered
   * bounds, so a line's position stays stable as its text is edited:
   * `'top'` anchors the font's ascender (so text hangs *below* the
   * entity's position), `'bottom'` anchors the font's descender (so text
   * sits *above* it), `'capline'` anchors the font's cap height - the top
   * of a capital letter like "H", shorter than `ascender`'s "tallest glyph
   * including ascenders like b/d/h" - and `'baseline'` anchors the first
   * line's own baseline directly (most useful for single-line text).
   *
   * `'middle'` instead centers this exact string's *actual* rendered ink,
   * since a font's ascender is typically taller than its descender is
   * deep - most glyphs have no descender at all - so centering on the
   * font's metrics would bias every descender-less string (numbers,
   * titles, most short UI labels) above the true visual center of its box.
   */
  verticalAlign: 'top' | 'middle' | 'bottom' | 'baseline' | 'capline';

  /**
   * Wraps at word boundaries when a line would exceed this width, in world
   * units. `undefined` (the default) never wraps.
   */
  maxWidth?: number;

  /**
   * The draw-order layer for this text, relative to other sprites/text drawn
   * by the same camera. Identical semantics to `SpriteEcsComponent.layer`.
   */
  layer: number;

  /** Whether this text is drawn at all. */
  enabled: boolean;

  /**
   * Outline color. `outlineWidth` of `0` (the default) draws no outline
   * regardless of this value.
   */
  outlineColor: Color;

  /**
   * Outline thickness, in screen-pixel-range units - a fixed number of
   * screen pixels regardless of camera zoom or entity scale, the same
   * scale-independent unit the MSDF anti-aliasing band itself uses. Drawn
   * as its own pass, always before every glyph's fill (see
   * `createTextRenderable`), so an outline can safely reach past a
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
  extends TextRequiredOptions, TextDefaultedOptions {}

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
    horizontalAlign: 'left',
    verticalAlign: 'top',
    layer: 0,
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
