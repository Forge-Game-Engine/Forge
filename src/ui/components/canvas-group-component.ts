import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link CanvasGroupEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface CanvasGroupDefaultedOptions {
  /**
   * An opacity multiplier applied to this entity and every UI descendant's
   * rendered alpha, combined multiplicatively with any ancestor
   * `CanvasGroupEcsComponent`'s own `alpha` (unless `ignoreParentGroups` is
   * set). Written into `SpriteEcsComponent.opacityMultiplier`/
   * `TextEcsComponent.opacityMultiplier` by `createUiCanvasGroupEcsSystem`
   * every frame - never set those fields directly on a descendant, they're
   * overwritten on the next tick. A descendant's own `tintColor.a`/
   * `color.a` still applies on top of this, so fading a group to `0` fades
   * every descendant regardless of its own tint. Defaults to `1` (fully
   * opaque, no effect). Only a glyph's fill is faded this way - a
   * `TextEcsComponent`'s outline/shadow effects don't currently inherit
   * group alpha, a known limitation.
   */
  alpha: number;

  /**
   * Whether this entity and every UI descendant participates in pointer/
   * gamepad interaction at all, ANDed with any ancestor group's own
   * `interactable` (unless `ignoreParentGroups` is set) and with each
   * descendant's own `UiInteractableEcsComponent.interactable`. `false`
   * disables hover-follows-focus and starting a new press on every
   * descendant, the same way setting `interactable: false` on each of them
   * individually would - the common "grey out and disable this whole
   * panel" case with one flag instead of one per element. Defaults to
   * `true`.
   */
  interactable: boolean;

  /**
   * Whether this entity and every UI descendant is considered by
   * `createUiRaycastEcsSystem` at all, ANDed with any ancestor group's own
   * `blocksRaycasts` (unless `ignoreParentGroups` is set) and with each
   * descendant's own `UiInteractableEcsComponent.blocksRaycasts`. `false`
   * makes the whole subtree transparent to raycasting - useful for a
   * modal's backdrop group that should still render but let clicks pass
   * through once dismissed. Defaults to `true`.
   */
  blocksRaycasts: boolean;

  /**
   * When `true`, this group's own `alpha`/`interactable`/`blocksRaycasts`
   * still apply to it and its descendants, but no ancestor
   * `CanvasGroupEcsComponent`'s values are combined in - the escape hatch
   * for a subtree (e.g. a modal's own close button) that should stay fully
   * opaque and interactive even while an ancestor group fades or disables
   * the rest of the screen. Defaults to `false`.
   */
  ignoreParentGroups: boolean;
}

export type CanvasGroupEcsComponent = CanvasGroupDefaultedOptions;

export const canvasGroupId =
  createComponentId<CanvasGroupEcsComponent>('canvasGroup');

const defaultCanvasGroupOptions: CanvasGroupDefaultedOptions = {
  alpha: 1,
  interactable: true,
  blocksRaycasts: true,
  ignoreParentGroups: false,
};

/**
 * Attaches a {@link CanvasGroupEcsComponent} to `entity`. Read by
 * `resolveCanvasGroupState` and applied by `createUiCanvasGroupEcsSystem`
 * (alpha) and by `createUiRaycastEcsSystem`/`createUiInteractionEcsSystem`/
 * `createUiNavigationEcsSystem` (interactable/blocksRaycasts) to every UI
 * descendant of `entity` - a whole panel, modal, or HUD section can be
 * faded, disabled, or made click-through with one component instead of one
 * per element.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the canvas group.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addCanvasGroupComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<CanvasGroupDefaultedOptions> = {},
): CanvasGroupEcsComponent {
  const component: CanvasGroupEcsComponent = {
    ...defaultCanvasGroupOptions,
    ...options,
  };

  return world.addComponent(entity, canvasGroupId, component);
}
