import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { RenderContext } from '../../rendering/render-context.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { setUiRect } from '../utilities/set-ui-rect.js';
import { createUiTextRenderable } from './create-ui-text-renderable.js';
import type {
  TextAlign,
  TextOverflow,
  TextVerticalAlign,
  TextWrap,
} from './shape-text.js';
import type { FontAsset } from './types/font-asset.js';
import { defaultUiTextOptions, uiTextId } from './ui-text-ecs-component.js';

/**
 * Options for {@link createUiText}.
 */
export interface CreateUiTextOptions {
  /** The string to display. */
  text: string;

  /** The font asset to use for rendering. */
  font: FontAsset;

  /** Display font size in pixels. Default `16`. */
  fontSize?: number;

  /** Text colour. Default `Color.white`. */
  color?: Color;

  /** Horizontal alignment. Default `'left'`. */
  align?: TextAlign;

  /** Vertical alignment. Default `'top'`. */
  verticalAlign?: TextVerticalAlign;

  /** Wrapping mode. Default `'none'`. */
  wrap?: TextWrap;

  /** Overflow handling. Default `'visible'`. */
  overflow?: TextOverflow;

  /** Global opacity multiplier (0–1). Default `1`. */
  opacity?: number;

  /** Draw order within the UI canvas (lower = further back). Default `0`. */
  zIndex?: number;

  /**
   * Position and size of the text element relative to its anchor, in pixels.
   * Uses `setUiRect` semantics (point-anchor mode: x/y are the top-left
   * offset from the anchor, width/height are pixel dimensions).
   */
  rect: { x: number; y: number; width: number; height: number };

  /** Anchor minimum (normalised 0–1). Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Anchor maximum (normalised 0–1). Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /** Pivot point (normalised 0–1). Defaults to `(0, 0)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Default `(1, 1)`. */
  scale?: Vector2;

  /** Parent entity id. When provided, the text element is a child. */
  parent?: number;

  /**
   * Rendering layer passed to {@link createUiTextRenderable}.
   * Defaults to `UI_RENDER_LAYER`.
   */
  layer?: number;
}

/**
 * Assembles a text entity in `world` and returns its entity id.
 *
 * The entity receives:
 * - {@link UiTransformEcsComponent} — layout anchors, pivot, rotation, scale
 * - {@link UiTextEcsComponent} — text content, font, style, and shaped-text cache
 * - `ParentEcsComponent` — if `options.parent` is provided
 *
 * The `Renderable` is created via {@link createUiTextRenderable} (cached per
 * font asset), so all text entities using the same font share one draw call.
 *
 * @param world - The ECS world to create the entity in.
 * @param renderContext - The WebGL render context (needed for the material).
 * @param options - Text content, font, layout, and style options.
 * @returns The entity id of the newly created text entity.
 */
export function createUiText(
  world: EcsWorld,
  renderContext: RenderContext,
  options: CreateUiTextOptions,
): number {
  const {
    text,
    font,
    fontSize = defaultUiTextOptions.fontSize,
    color = defaultUiTextOptions.color,
    align = defaultUiTextOptions.align,
    verticalAlign = defaultUiTextOptions.verticalAlign,
    wrap = defaultUiTextOptions.wrap,
    overflow = defaultUiTextOptions.overflow,
    opacity = defaultUiTextOptions.opacity,
    zIndex = defaultUiTextOptions.zIndex,
    rect,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    pivot = new Vector2(0, 0),
    rotation = 0,
    scale = new Vector2(1, 1),
    parent,
    layer,
  } = options;

  const entity = world.createEntity();

  const transform = world.addComponent(entity, uiTransformId, {
    anchorMin,
    anchorMax,
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot,
    rotation,
    scale,
    resolvedRect: new Rect(
      new Vector2(0, 0),
      new Vector2(rect.width, rect.height),
    ),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  setUiRect(transform, rect);

  const renderable = createUiTextRenderable(renderContext, font, layer);

  world.addComponent(entity, uiTextId, {
    text,
    font,
    fontSize,
    color,
    align,
    verticalAlign,
    wrap,
    overflow,
    opacity,
    zIndex,
    enabled: true,
    renderable,
    dirty: true,
  });

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  return entity;
}
