import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link LayoutElementEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface LayoutElementDefaultedOptions {
  /**
   * Excludes this entity from its parent's layout group entirely - the
   * group neither measures it (its size doesn't count toward the group's
   * own preferred/min size) nor arranges it (its `RectTransformEcsComponent`
   * is left untouched). Useful for a decorative child (a background flourish,
   * a badge overlay) placed inside a panel a `HorizontalLayoutGroupEcsComponent`/
   * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent` also
   * arranges. Defaults to `false`.
   */
  ignoreLayout: boolean;
}

/**
 * ECS-style component interface overriding a UI element's measured size for
 * `createUiLayoutGroupEcsSystem` and `ContentSizeFitterEcsComponent`. Every
 * field but `ignoreLayout` is optional - omitted, a group falls back to this
 * element's current `RectTransformEcsComponent.sizeOrMargin` as its preferred
 * size, with a min of `0` and a flexible weight of `0` (fixed size, taking
 * no share of any leftover space in a force-expanded group). Add this
 * component only to override that default on a per-field basis; a plain
 * `RectTransformEcsComponent` with no `LayoutElementEcsComponent` at all is
 * still a perfectly valid, fixed-size layout group child.
 */
export interface LayoutElementEcsComponent extends LayoutElementDefaultedOptions {
  /** Overrides the smallest width a group will ever shrink this element to. */
  minWidth?: number;

  /** Overrides the smallest height a group will ever shrink this element to. */
  minHeight?: number;

  /**
   * Overrides this element's natural width, before any group distributes
   * leftover space.
   */
  preferredWidth?: number;

  /**
   * Overrides this element's natural height, before any group distributes
   * leftover space.
   */
  preferredHeight?: number;

  /**
   * This element's share of a force-expanding group's leftover horizontal
   * space, relative to its siblings' own `flexibleWidth` - e.g. `2` takes
   * twice the leftover space of a sibling with `1`. `0` (the default) takes
   * none.
   */
  flexibleWidth?: number;

  /**
   * This element's share of a force-expanding group's leftover vertical
   * space, relative to its siblings' own `flexibleHeight`. `0` (the default)
   * takes none.
   */
  flexibleHeight?: number;

  /**
   * This element's preferred (and min) size, on whichever axis this is
   * relevant to, comes from its own `TextMeshEcsComponent.bounds` instead of
   * `RectTransformEcsComponent.sizeOrMargin`. Requires a `TextEcsComponent`
   * on the same entity - `createUiLayoutGroupEcsSystem` throws otherwise. Its
   * `TextMeshEcsComponent` (added once `createTextShapingEcsSystem` actually
   * shapes the text) may not exist yet on the very first tick a brand-new
   * entity is created - that tick measures as `0` rather than throwing,
   * self-correcting the next tick once shaping runs. An explicit
   * `preferredWidth`/`preferredHeight` still overrides this, the same
   * precedence every other `LayoutElementEcsComponent` field already has.
   * Defaults to `false`.
   */
  sizeToText?: boolean;
}

export const layoutElementId =
  createComponentId<LayoutElementEcsComponent>('layoutElement');

const defaultLayoutElementOptions: LayoutElementDefaultedOptions = {
  ignoreLayout: false,
};

/**
 * Attaches a {@link LayoutElementEcsComponent} to `entity`, overriding how
 * `createUiLayoutGroupEcsSystem` measures and (if `childControlWidth`/
 * `childControlHeight` is enabled on the parent group) resizes it. Every
 * field is optional - pass only the ones you need to override.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the layout element.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addLayoutElementComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<LayoutElementEcsComponent> = {},
): LayoutElementEcsComponent {
  const component: LayoutElementEcsComponent = {
    ...defaultLayoutElementOptions,
    ...options,
  };

  return world.addComponent(entity, layoutElementId, component);
}
