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
import { defaultUiRenderCategory } from './create-ui-canvas.js';

export type CreateLabelOptions = TextRequiredOptions &
  Partial<TextDefaultedOptions> & {
    /** The anchor/pivot preset to place the label with. Defaults to `UiAnchor.center`. */
    anchor?: UiAnchorPreset;

    /** Offset of the label's pivot from its anchor reference point, in reference pixels. */
    anchoredPosition?: Vector2;

    /**
     * Size in reference pixels when point-anchored; a margin relative to the
     * anchor rect when stretched. Note this sizes the label's *rect* for
     * anchoring purposes only - `createUiLayoutEcsSystem` doesn't (yet) sync
     * it with `TextEcsComponent.maxWidth`, so wrapping still needs
     * `maxWidth` set explicitly.
     */
    sizeDelta?: Vector2;
  };

const defaultCreateLabelOptions = {
  anchor: UiAnchor.center,
  category: defaultUiRenderCategory,
};

/**
 * Creates a UI label: an entity with a `RectTransformEcsComponent` (parented
 * to `parent`) and a `TextEcsComponent`. Every `TextEcsComponent` option
 * (`text`, `fontAtlas`, `size`, and the rest) is accepted directly, and
 * `category` defaults to `defaultUiRenderCategory` - matching
 * `createUiCanvas`'s own default `cullingMask` - rather than
 * `TextEcsComponent`'s own default (`TEXT_RENDER_CATEGORY`), so a label is
 * visible through its canvas's UI camera without either one needing to be
 * hand-tuned to agree, for the common case of a canvas created with default
 * options.
 * @param world - The ECS world to create the label entity in.
 * @param parent - The entity to parent the label to - required, no default.
 * There's no standalone "no parent" case: pass the canvas entity itself
 * (see `createUiCanvas`) for a top-level label, or another UI element (a
 * panel, a button) to position the label relative to it, the way the label
 * inside a button is parented to the button rather than to the canvas
 * directly (see `design/ui-system.md`'s "Anatomy of a button").
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
