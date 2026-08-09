import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
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
   * Horizontal alignment of each line within the shaped block's own width.
   * Irrelevant, and ignored, when `maxWidth` is unset (a single unwrapped
   * line is always exactly as wide as the block itself, so every mode
   * produces the same result).
   */
  horizontalAlign: 'left' | 'center' | 'right' | 'justify';

  /**
   * Vertical alignment of the shaped block's visible ink relative to the
   * entity's position: `'top'` anchors the first line's ascender (so text
   * hangs *below* the entity's position), `'bottom'` anchors the last
   * line's descender (so text sits *above* it), and `'middle'` centers the
   * ink between the two - not the font's line-height box, which typically
   * doesn't match the ink's own extent.
   */
  verticalAlign: 'top' | 'middle' | 'bottom';

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
   * The outline's color. Has no visible effect while `outlineWidth` is `0`
   * (the default), regardless of this value.
   */
  outlineColor: Color;

  /**
   * The outline's thickness, in screen-pixel-range units - the same
   * scale-independent unit the MSDF anti-aliasing band itself is measured
   * in, so an outline stays a constant on-screen thickness whether the text
   * is scaled up or the camera zooms in. `0` (the default) draws no outline
   * at all, regardless of `outlineColor`.
   */
  outlineWidth: number;

  /**
   * The soft shadow's color. Has no visible effect while its alpha is `0`
   * (the default, `Color.transparent`), regardless of `shadowOffset`/
   * `shadowSoftness`.
   */
  shadowColor: Color;

  /**
   * The soft shadow's offset from the glyph, in screen-pixel-range units
   * (same convention as `outlineWidth`). Defaults to `(0, 0)`.
   */
  shadowOffset: Vector2;

  /**
   * How blurred the soft shadow's edge is, in screen-pixel-range units. `0`
   * (the default) draws a shadow with the same crisp edge as the glyph
   * itself, just offset; larger values widen and soften the falloff.
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
    shadowOffset: Vec2.zero,
    shadowSoftness: 0,
  };

  const component: TextEcsComponent = {
    ...defaultTextOptions,
    ...options,
  };

  return world.addComponent(entity, textId, component);
}
