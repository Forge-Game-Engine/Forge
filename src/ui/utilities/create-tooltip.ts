import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { Color, SpriteEcsComponent, spriteId } from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  textHorizontalAlignments,
  textId,
  textVerticalAlignments,
} from '../../text/index.js';
import { addTooltipComponent } from '../components/tooltip-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { UiAxis } from '../types/ui-axis.js';
import { createLabel } from './create-label.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateTooltipOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateTooltipRequiredOptions {
  /** The tooltip's text. */
  text: string;

  /** The loaded font atlas the text is drawn from. */
  fontAtlas: FontAtlas;

  /** The text's font size, in reference pixels. */
  textSize: number;

  /** The sprite to draw the tooltip's background panel with, e.g. from `createImageSprite`. */
  sprite: SpriteEcsComponent;
}

/**
 * Fields of {@link CreateTooltipOptions} with a sensible default; callers
 * may omit these.
 */
export interface CreateTooltipDefaultedOptions {
  /** The tooltip panel's size, in reference pixels. Defaults to `{ x: 160, y: 40 }`. */
  size: Vector2;

  /**
   * Gap between the source element's top edge and the tooltip's bottom
   * edge, in reference pixels. Defaults to `{ x: 0, y: 8 }` - a small
   * vertical gap, horizontally centered over the source.
   */
  offset: Vector2;

  /** How long, in milliseconds, the source must stay hovered/focused before the tooltip appears. Defaults to `400`. */
  showDelayMilliseconds: number;

  /** The text's tint. Defaults to `Color.white`. */
  textColor: Color;

  /**
   * The render category the tooltip's label text draws with, forwarded to
   * `createLabel`'s `category` option - the panel's own category comes
   * from `sprite.renderable.category` instead, unaffected by this. Pass
   * the same value you gave the tooltip's canvas's `cullingMask` (see
   * `CreateUiCanvasDefaultedOptions.cullingMask`) so the label is actually
   * visible through it. Omitted, the label falls back to `TextEcsComponent`'s
   * own default (`TEXT_RENDER_CATEGORY`).
   */
  category?: number;
}

export type CreateTooltipOptions = CreateTooltipRequiredOptions &
  Partial<CreateTooltipDefaultedOptions>;

export interface Tooltip {
  /** The tooltip panel's entity - a `RectTransformEcsComponent` + `SpriteEcsComponent`, parented to `source`. */
  panel: number;

  /** The tooltip's child label entity - see `createLabel`. */
  label: number;
}

/**
 * Attaches a tooltip to `source` - an already-interactable entity (it must
 * already carry a `UiInteractableEcsComponent`, e.g. from `createButton` or
 * `addUiInteractableComponent`) - and a `TooltipEcsComponent` driving it.
 *
 * The tooltip panel is parented directly to `source` with an anchor pinned
 * to its top edge, pivoted at the panel's own bottom edge, so it floats
 * just above `source` and follows it automatically as an ordinary UI child
 * - `createUiTooltipEcsSystem` only ever toggles it visible/hidden, never
 * repositions it. Both the panel and its label start hidden
 * (`enabled: false`); `createUiTooltipEcsSystem` shows them once `source`
 * has been continuously hovered or focused for `showDelayMilliseconds`.
 *
 * A tooltip's draw order still follows hierarchy position like any other
 * UI element (see the UI doc's "Draw order" note) - for a tooltip that
 * must always render above every other element regardless of where its
 * source sits in the tree, create it last, after every other UI element on
 * the canvas.
 * @param world - The ECS world `source` belongs to.
 * @param source - The interactable entity the tooltip appears near. Must
 * already have a `UiInteractableEcsComponent`.
 * @param options - Options for configuring the tooltip. `text`,
 * `fontAtlas`, `textSize`, and `sprite` have no sensible default and must
 * always be provided.
 * @throws An error if `source` has no `UiInteractableEcsComponent`.
 * @returns The created tooltip's panel and label entities.
 */
export function createTooltip(
  world: EcsWorld,
  source: number,
  options: CreateTooltipOptions,
): Tooltip {
  const defaultCreateTooltipOptions = {
    size: { x: 160, y: 40 },
    offset: { x: 0, y: 8 },
    showDelayMilliseconds: 400,
    textColor: Color.white,
  };

  const {
    text,
    fontAtlas,
    textSize,
    sprite,
    size,
    offset,
    showDelayMilliseconds,
    textColor,
    category,
  } = { ...defaultCreateTooltipOptions, ...options };

  if (!world.getComponent(source, uiInteractableId)) {
    throw new Error(
      "createTooltip requires `source` to already have a UiInteractableEcsComponent (e.g. from createButton or addUiInteractableComponent) - a tooltip is shown/hidden based on that component's hover/focus state.",
    );
  }

  const panel = createPanel(world, source, {
    sprite,
    anchor: {
      x: UiAxis.point(0.5, { size: size.x }),
      y: UiAxis.point(1, { pivot: 0, size: size.y }),
    },
    anchoredPosition: offset,
  });

  const label = createLabel(world, panel, {
    text,
    fontAtlas,
    size: textSize,
    anchor: UiAnchor.stretchAll(),
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    ...(category !== undefined && { category }),
  });

  world.getComponent<SpriteEcsComponent>(panel, spriteId)!.enabled = false;
  world.getComponent(label, textId)!.enabled = false;

  addTooltipComponent(world, source, {
    panel,
    label,
    showDelayMilliseconds,
  });

  return { panel, label };
}
