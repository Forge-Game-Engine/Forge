import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * How `ContentSizeFitterEcsComponent` sizes one axis of its own
 * `RectTransformEcsComponent`.
 */
export type UiContentSizeFitMode =
  'unconstrained' | 'minSize' | 'preferredSize';

/**
 * Fields of {@link ContentSizeFitterEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface ContentSizeFitterDefaultedOptions {
  /** How the `x` axis is fit. `unconstrained` (the default) leaves it alone. */
  horizontalFit: UiContentSizeFitMode;

  /** How the `y` axis is fit. `unconstrained` (the default) leaves it alone. */
  verticalFit: UiContentSizeFitMode;
}

export type ContentSizeFitterEcsComponent = ContentSizeFitterDefaultedOptions;

export const contentSizeFitterId =
  createComponentId<ContentSizeFitterEcsComponent>('contentSizeFitter');

const defaultContentSizeFitterOptions: ContentSizeFitterDefaultedOptions = {
  horizontalFit: 'unconstrained',
  verticalFit: 'unconstrained',
};

/**
 * Attaches a {@link ContentSizeFitterEcsComponent} to `entity`, resizing its
 * `RectTransformEcsComponent`'s own size every frame (via
 * `createUiLayoutGroupEcsSystem`, alongside its layout-group handling) to
 * match `entity`'s own measured content size on each configured axis - the
 * same min/preferred size a `HorizontalLayoutGroupEcsComponent`/
 * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent` on
 * `entity` would report to a parent group, or `entity`'s own
 * `LayoutElementEcsComponent` overrides. With neither, there's no content to
 * measure and this is a no-op - pair it with one of those, most commonly a
 * layout group, to make a panel shrink-wrap its arranged children.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Assumes a
 * point-anchored `RectTransformEcsComponent` (its `x`/`y` are each a
 * literal size, not a stretch margin).
 * @param options - Options for configuring the fitter.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addContentSizeFitterComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ContentSizeFitterEcsComponent> = {},
): ContentSizeFitterEcsComponent {
  const component: ContentSizeFitterEcsComponent = {
    ...defaultContentSizeFitterOptions,
    ...options,
  };

  return world.addComponent(entity, contentSizeFitterId, component);
}
