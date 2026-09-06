import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link TooltipEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface TooltipRequiredOptions {
  /**
   * The entity carrying the tooltip's `SpriteEcsComponent` (its background
   * panel) - toggled `enabled` by `createUiTooltipEcsSystem` to show/hide
   * the tooltip. `createTooltip` builds this for you.
   */
  panel: number;

  /**
   * The entity carrying the tooltip's `TextEcsComponent` - toggled
   * `enabled` alongside `panel`. `createTooltip` builds this for you.
   */
  label: number;
}

/**
 * Fields of {@link TooltipEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface TooltipDefaultedOptions {
  /**
   * How long, in milliseconds, the source element must stay hovered or
   * focused before the tooltip appears. Defaults to `400`.
   */
  showDelayMilliseconds: number;
}

/**
 * Attach to an interactable entity (alongside its own
 * `UiInteractableEcsComponent`) to show a floating panel/label near it
 * after it's been hovered or focused for `showDelayMilliseconds` - see
 * `createTooltip` for the usual way to build one, and
 * `createUiTooltipEcsSystem` for the system that drives it.
 */
export interface TooltipEcsComponent
  extends TooltipRequiredOptions, TooltipDefaultedOptions {
  /**
   * Milliseconds the source element has been continuously hovered or
   * focused - `deriveUiInteractionVisualState`'s `hover`/`pressed` states,
   * `normal`/`disabled` reset it to `0`. System-owned, written by
   * `createUiTooltipEcsSystem`; read-only to callers.
   */
  hoverElapsedMilliseconds: number;
}

export const tooltipId = createComponentId<TooltipEcsComponent>('tooltip');

const defaultTooltipOptions: TooltipDefaultedOptions & {
  hoverElapsedMilliseconds: number;
} = {
  showDelayMilliseconds: 400,
  hoverElapsedMilliseconds: 0,
};

/**
 * Attaches a {@link TooltipEcsComponent} to `entity`. `entity` also needs a
 * `UiInteractableEcsComponent` - `createUiTooltipEcsSystem` reads its
 * hover/focus state to decide when to show the tooltip.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the tooltip. `panel`/`label`
 * have no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTooltipComponent(
  world: EcsWorld,
  entity: number,
  options: TooltipRequiredOptions & Partial<TooltipDefaultedOptions>,
): TooltipEcsComponent {
  const component: TooltipEcsComponent = {
    ...defaultTooltipOptions,
    ...options,
  };

  return world.addComponent(entity, tooltipId, component);
}
