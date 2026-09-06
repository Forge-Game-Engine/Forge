import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  addTextComponent,
  TextDefaultedOptions,
  TextRequiredOptions,
  textVerticalAlignments,
} from '../../text/index.js';
import { addLayoutElementComponent } from '../components/layout-element-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';

export type CreateLabelOptions = TextRequiredOptions &
  Partial<TextDefaultedOptions> & {
    /**
     * The anchor to place the label with - see `UiAnchor` for common
     * presets (e.g. `UiAnchor.center({ x: 200, y: 60 })`). Defaults to
     * `UiAnchor.center()`.
     */
    anchor?: UiAnchorConfig;

    /** Offset of the label's pivot from its anchor reference point, in reference pixels. */
    anchoredPosition?: Vector2;

    /**
     * When `true`, attaches a `LayoutElementEcsComponent` with
     * `sizeToText: true`, so a parent layout group measures this label by
     * its own shaped text bounds instead of its own rect. Also defaults
     * `verticalAlign` to `'bottom'` (unless explicitly overridden) - a
     * layout-arranged child is always forced to a bottom-left pivot (see
     * `placeChild`'s doc comment in `ui-layout-group-system.ts`), and
     * `verticalAlign`'s own default (`'top'`) assumes a top pivot instead,
     * which renders the text a full line-height below its own
     * `sizeToText`-measured box rather than inside it. Defaults to `false`.
     */
    sizeToText?: boolean;
  };

const defaultCreateLabelOptions = {
  anchor: UiAnchor.center(),
};

/**
 * Creates a UI label: an entity with a `RectTransformEcsComponent` (parented
 * to `parent`) and a `TextEcsComponent`. Every `TextEcsComponent` option
 * (`text`, `fontAtlas`, `size`, and the rest) is accepted directly. `category`
 * is not defaulted here - omitted, it falls through to `TextEcsComponent`'s
 * own default (`TEXT_RENDER_CATEGORY`), which has nothing to do with any
 * particular canvas's culling mask. To make a label visible through a
 * specific `createUiCanvas`, pass the same `category` value you gave that
 * canvas's `cullingMask` (see `CreateUiCanvasDefaultedOptions.cullingMask`
 * for why there's no shared default to fall back on).
 * @param world - The ECS world to create the label entity in.
 * @param parent - The entity to parent the label to - required, no default.
 * There's no standalone "no parent" case: pass the canvas entity itself
 * (see `createUiCanvas`) for a top-level label, or another UI element (a
 * panel, a button) to position the label relative to it, the way `createButton`
 * parents its own label to the button rather than to the canvas directly.
 * @param options - Options for configuring the label. `text`, `fontAtlas`,
 * and `size` have no sensible default and must always be provided.
 * @returns The created label entity.
 */
export function createLabel(
  world: EcsWorld,
  parent: number,
  options: CreateLabelOptions,
): number {
  const { anchor, anchoredPosition, sizeToText, ...textOptions } = {
    ...defaultCreateLabelOptions,
    ...(options.sizeToText && options.verticalAlign === undefined
      ? { verticalAlign: textVerticalAlignments.bottom }
      : {}),
    ...options,
  };

  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, {
    ...anchor,
    ...(anchoredPosition && { anchoredPosition }),
  });
  addTextComponent(world, entity, textOptions);

  if (sizeToText) {
    addLayoutElementComponent(world, entity, { sizeToText: true });
  }

  return entity;
}
