import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { linear } from '../../animations/easing-functions/index.js';
import { Color } from '../../rendering/index.js';
import {
  UiInteractionVisualState,
  uiInteractionVisualStates,
} from '../types/ui-interaction-visual-state.js';

/**
 * Fields of {@link UiColorTransitionEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface UiColorTransitionDefaultedOptions {
  /** Tint while `deriveUiInteractionVisualState` is `normal`. */
  normalColor: Color;

  /** Tint while `deriveUiInteractionVisualState` is `hover` (hovered or focused). */
  hoverColor: Color;

  /** Tint while `deriveUiInteractionVisualState` is `pressed`. */
  pressedColor: Color;

  /** Tint while `deriveUiInteractionVisualState` is `disabled`. */
  disabledColor: Color;

  /** How long, in milliseconds, a tint change takes to fully ease in. */
  duration: number;

  /**
   * The easing function driving the tint change, one of
   * `animations/easing-functions`. Defaults to `linear`.
   */
  easing: (t: number) => number;
}

export interface UiColorTransitionEcsComponent extends UiColorTransitionDefaultedOptions {
  /**
   * The visual state the current tween is easing towards. System-owned,
   * written by `createUiTransitionEcsSystem` when the derived visual state
   * changes; read-only to callers.
   */
  targetState: UiInteractionVisualState;

  /**
   * The tint the current tween started from. System-owned, written by
   * `createUiTransitionEcsSystem` whenever `targetState` changes (so a
   * mid-tween state change eases from the color actually on screen, not
   * from the previous target); read-only to callers.
   */
  fromColor: Color;

  /**
   * Milliseconds elapsed in the current tween. System-owned, written by
   * `createUiTransitionEcsSystem`; read-only to callers.
   */
  elapsedMilliseconds: number;
}

export const uiColorTransitionId =
  createComponentId<UiColorTransitionEcsComponent>('uiColorTransition');

/**
 * Attaches a {@link UiColorTransitionEcsComponent} to `entity`. Needs a
 * `UiInteractableEcsComponent` (to derive the visual state from) and a
 * `SpriteEcsComponent` (whose `tintColor` `createUiTransitionEcsSystem`
 * eases) on the same entity.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the transition. Colors default
 * to `Color.white` (i.e. no tint change) for any state not given.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addUiColorTransitionComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiColorTransitionDefaultedOptions> = {},
): UiColorTransitionEcsComponent {
  // Built inside the function body (rather than as a shared module-level
  // default) since it references `Color.white`, and `rendering` and `ui`
  // participate in a load-time import cycle - resolving that reference
  // eagerly at this module's own top level can run before `rendering`'s
  // `Color` export exists yet. See `sprite-component.ts`'s
  // `defaultSpriteOptions` for the same pattern.
  const defaultUiColorTransitionOptions: UiColorTransitionDefaultedOptions = {
    normalColor: Color.white,
    hoverColor: Color.white,
    pressedColor: Color.white,
    disabledColor: Color.white,
    duration: 100,
    easing: linear,
  };

  const merged = { ...defaultUiColorTransitionOptions, ...options };

  const component: UiColorTransitionEcsComponent = {
    ...merged,
    targetState: uiInteractionVisualStates.normal,
    fromColor: merged.normalColor,
    elapsedMilliseconds: merged.duration,
  };

  return world.addComponent(entity, uiColorTransitionId, component);
}
