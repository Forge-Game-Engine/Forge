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
} from '../../text/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorPreset } from '../types/ui-anchor.js';

export type CreateLabelOptions = TextRequiredOptions &
  Partial<TextDefaultedOptions> & {
    /** The anchor/pivot preset to place the label with. Defaults to `UiAnchor.center`. */
    anchor?: UiAnchorPreset;

    /** Offset of the label's pivot from its anchor reference point, in reference pixels. */
    anchoredPosition?: Vector2;

    /**
     * Size in reference pixels when point-anchored; a margin relative to the
     * anchor rect when stretched. For a point anchor this sizes the label's
     * *rect* for anchoring purposes only - `TextEcsComponent.maxWidth`
     * still needs setting explicitly for wrapping/`horizontalAlign` to have
     * an actual box to work against, and its pivot needs to be `0` (a
     * left-pivoted preset, e.g. `UiAnchor.middleLeft`) for `horizontalAlign`
     * to measure against the right edge - see `createButton`'s own use of
     * both for why. For a stretch-x anchor (any anchor whose `anchorMin.x`
     * and `anchorMax.x` differ, e.g. `UiAnchor.stretchAll`),
     * `createUiLayoutEcsSystem` keeps `maxWidth` and `horizontalAlignPivot`
     * in sync with the resolved rect every frame instead - so `horizontalAlign`
     * works correctly under *any* pivot, not just a left one - overriding
     * whatever `maxWidth` was passed here.
     */
    sizeDelta?: Vector2;
  };

const defaultCreateLabelOptions = {
  anchor: UiAnchor.center,
};

/**
 * Creates a UI label: an entity with a `RectTransformEcsComponent` (parented
 * to `parent`) and a `TextEcsComponent`. Every `TextEcsComponent` option
 * (`text`, `fontAtlas`, `size`, and the rest) is accepted directly. `category`
 * is not defaulted here - omitted, it falls through to `TextEcsComponent`'s
 * own default (`TEXT_RENDER_CATEGORY`), which has nothing to do with any
 * particular canvas's culling mask. To make a label visible through a
 * specific `createUiCanvas`, pass the same `category` value you gave that
 * canvas's `cullingMask` (see `CreateUiCanvasRequiredOptions.cullingMask`
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
  const { anchor, anchoredPosition, sizeDelta, ...textOptions } = {
    ...defaultCreateLabelOptions,
    ...options,
  };

  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, {
    ...anchor,
    ...(anchoredPosition && { anchoredPosition }),
    ...(sizeDelta && { sizeDelta }),
  });
  addTextComponent(world, entity, textOptions);

  return entity;
}
