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
     * anchor rect when stretched. Note this sizes the label's *rect* for
     * anchoring purposes only - `createUiLayoutEcsSystem` doesn't (yet) sync
     * it with `TextEcsComponent.maxWidth`, so wrapping still needs
     * `maxWidth` set explicitly.
     */
    sizeDelta?: Vector2;
  };

const defaultCreateLabelOptions = {
  anchor: UiAnchor.center,
};

/**
 * Creates a UI label: an entity with a `RectTransformEcsComponent` (parented
 * to `parent`) and a `TextEcsComponent`. Every `TextEcsComponent` option
 * (`text`, `fontAtlas`, `size`, and the rest) is accepted directly.
 * @param world - The ECS world to create the label entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
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
