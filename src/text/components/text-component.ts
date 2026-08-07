import { FontAtlas } from '../../asset-loading/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
// Imported from their own leaf files (not `../../rendering/index.js`) so
// this file never has a runtime dependency on `render-system.ts`, which
// itself imports `textId`/`TextMeshEcsComponent` from this module - a
// `Renderable`/`Color` value import routed through the rendering barrel
// would create a genuine circular module load between `/rendering` and
// `/text`. `Renderable` is only ever used here as a field type, so it's
// imported as a type-only import to guarantee it's erased entirely.
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';

/**
 * How a text block's lines are horizontally positioned relative to the
 * block's own width (the widest line, or `wrapWidth` when set).
 */
export type TextAlignment = 'left' | 'center' | 'right';

/**
 * Fields of {@link TextEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface TextRequiredOptions {
  /**
   * The string to render. Explicit `\n` characters start a new line;
   * `wrapWidth` (if set) additionally breaks lines between words.
   */
  text: string;

  /**
   * The font atlas metrics to shape `text` against.
   */
  font: FontAtlas;

  /**
   * The renderable used to draw this text's glyph quads, built once per
   * `FontAtlas` via `createMsdfTextRenderable` (`/rendering`) and shared
   * across every entity using that font, so they batch into a single
   * instanced draw call.
   */
  renderable: Renderable;

  /**
   * The font size, in world units, that `font`'s em-normalized metrics are
   * scaled by.
   */
  fontSize: number;
}

/**
 * Fields of {@link TextEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface TextDefaultedOptions {
  /**
   * The text's color. Multiplied against the MSDF atlas's reconstructed
   * coverage, so unlike `SpriteEcsComponent.tintColor` this is the text's
   * actual, only color rather than a tint over a sampled texture color.
   * Defaults to `Color.white`.
   */
  color: Color;

  /**
   * How each line is horizontally positioned relative to the text block's
   * own width. Defaults to `'left'`.
   */
  alignment: TextAlignment;

  /**
   * The width, in world units, that lines wrap to fit within, breaking
   * between words (not mid-word). Omit for a single unwrapped line per `\n`
   * in `text`, however long.
   */
  wrapWidth?: number;

  /**
   * A multiplier over `font.lineHeight` for the vertical distance between
   * successive lines' baselines. Defaults to `1`.
   */
  lineSpacing: number;

  /**
   * The text block's origin, normalized to the block's own size: `(0, 0)`
   * is the top-left corner, `(0.5, 0.5)` (the default) is the center, and
   * `(1, 1)` is the bottom-right corner - matching
   * `SpriteEcsComponent.pivot`'s convention exactly.
   */
  pivot: Vector2;

  /**
   * Whether this text is drawn. When `false`, the render system skips this
   * entity entirely, before any culling-mask check.
   */
  enabled: boolean;

  /**
   * The draw-order layer for this text, relative to other sprites/text
   * drawn by the same camera - see `SpriteEcsComponent.layer`.
   */
  layer: number;
}

export interface TextEcsComponent
  extends TextRequiredOptions, TextDefaultedOptions {}

export const textId = createComponentId<TextEcsComponent>('text');

/**
 * Attaches a {@link TextEcsComponent} to `entity`. `createTextShapingEcsSystem`
 * shapes `text` into glyph quads (a `TextMeshEcsComponent`, added
 * automatically) whenever `text`, `font`, `fontSize`, `wrapWidth`,
 * `lineSpacing`, `alignment`, or `pivot` change.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the text. `text`, `font`,
 * `renderable`, and `fontSize` have no sensible default and must always be
 * provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTextComponent(
  world: EcsWorld,
  entity: number,
  options: TextRequiredOptions & Partial<TextEcsComponent>,
): TextEcsComponent {
  // Built inside the function body (rather than as a shared module-level
  // default), matching `addSpriteComponent`: `Color.white` can't be safely
  // read at module-init time in a codebase with circular import cycles
  // through barrel files, and `pivot` is a `Vector2` callers/systems may
  // mutate in place, so each entity needs its own instance.
  const defaultTextOptions: TextDefaultedOptions = {
    color: Color.white,
    alignment: 'left',
    lineSpacing: 1,
    pivot: { x: 0.5, y: 0.5 },
    enabled: true,
    layer: 0,
  };

  const component: TextEcsComponent = {
    ...defaultTextOptions,
    ...options,
  };

  return world.addComponent(entity, textId, component);
}
