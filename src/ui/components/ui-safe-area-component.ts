import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link UiSafeAreaEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface UiSafeAreaDefaultedOptions {
  /** Whether to inset away from the top safe-area edge. Defaults to `true`. */
  top: boolean;

  /** Whether to inset away from the right safe-area edge. Defaults to `true`. */
  right: boolean;

  /** Whether to inset away from the bottom safe-area edge. Defaults to `true`. */
  bottom: boolean;

  /** Whether to inset away from the left safe-area edge. Defaults to `true`. */
  left: boolean;
}

/**
 * Attach to a full-stretch-anchored UI element (`UiAnchor.stretchAll()`) to
 * keep it clear of a device's notch, camera cutout, rounded corners, or
 * home indicator - `createUiSafeAreaEcsSystem` overwrites its
 * `RectTransformEcsComponent.x`/`y`/`anchoredPosition` every frame to shrink
 * its rect inward from whichever edges the live safe-area insets (see
 * `getSafeAreaInsets`) actually need, so critical content (a pause button
 * pinned to a corner, a HUD bar along an edge) never renders under a notch.
 * Set a field `false` to leave that specific edge flush with its parent
 * regardless of the device's insets - e.g. a bottom bar that intentionally
 * extends under a home indicator.
 */
export type UiSafeAreaEcsComponent = UiSafeAreaDefaultedOptions;

export const uiSafeAreaId =
  createComponentId<UiSafeAreaEcsComponent>('uiSafeArea');

const defaultUiSafeAreaOptions: UiSafeAreaDefaultedOptions = {
  top: true,
  right: true,
  bottom: true,
  left: true,
};

/**
 * Attaches a {@link UiSafeAreaEcsComponent} to `entity`. `entity` should
 * already be anchored with `UiAnchor.stretchAll()` - `createUiSafeAreaEcsSystem`
 * takes over its `x`/`y`/`anchoredPosition` entirely, the same way a
 * slider's handle axis is system-owned.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring which edges to inset.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addUiSafeAreaComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiSafeAreaDefaultedOptions> = {},
): UiSafeAreaEcsComponent {
  const component: UiSafeAreaEcsComponent = {
    ...defaultUiSafeAreaOptions,
    ...options,
  };

  return world.addComponent(entity, uiSafeAreaId, component);
}
