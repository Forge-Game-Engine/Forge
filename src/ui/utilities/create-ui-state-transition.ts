import { EcsWorld } from '../../ecs/ecs-world.js';
import { UiRenderableEcsComponent } from '../components/ui-renderable-component.js';
import { UiStateEcsComponent } from '../components/ui-state-component.js';
import { UiStateStyleConfig, UiStyleOverride } from './apply-ui-state-style.js';
import {
  animateUiBorderColor,
  animateUiBorderWidth,
  animateUiCornerRadius,
  animateUiOpacity,
  animateUiTintColor,
} from './animate-ui-property.js';

/**
 * Controls the speed and easing of state-driven visual transitions on a
 * UI widget (hover, press, focus, disabled).
 */
export interface UiTransitionSpec {
  /** Transition duration in milliseconds. Default `150`. */
  duration: number;
  /** Easing function. Defaults to `linear`. */
  easing?: (t: number) => number;
}

/** Default {@link UiTransitionSpec} used when none is provided. */
export const defaultUiTransitionSpec: UiTransitionSpec = {
  duration: 150,
};

/**
 * Computes the target {@link UiStyleOverride} for the current state flags by
 * layering active-state overrides on top of `base` in priority order:
 * `base → hover → focused → pressed → disabled`.
 *
 * This mirrors the logic in `applyUiStateStyle` but returns the target rather
 * than applying it, so callers can animate toward it.
 *
 * @param state - Current interaction state flags.
 * @param base - The resting style that active-state overrides layer on top of.
 * @param config - Per-state style deltas.
 * @returns A fully resolved {@link UiStyleOverride} for the current state.
 */
export function computeUiTargetStyle(
  state: UiStateEcsComponent,
  base: UiStyleOverride,
  config: UiStateStyleConfig,
): UiStyleOverride {
  const result: UiStyleOverride = { ...base };

  if (state.hovered && config.hover) {
    Object.assign(result, config.hover);
  }

  if (state.focused && config.focused) {
    Object.assign(result, config.focused);
  }

  if (state.pressed && config.pressed) {
    Object.assign(result, config.pressed);
  }

  if (state.disabled && config.disabled) {
    Object.assign(result, config.disabled);
  }

  return result;
}

/**
 * Wires up animated state transitions on a UI widget entity.
 *
 * Subscribes to all interaction events on `state` and, on each transition,
 * animates the relevant fields of `renderableComp` toward the new target style
 * computed from `config` and `base`. Any in-flight animation for the same
 * property is cancelled before the new one starts, so rapid hover-in/out
 * sequences never stack.
 *
 * This is a drop-in animated replacement for the snap `applyUiStateStyle`
 * pattern used in Epic 5 widget factories.
 *
 * @param world - The ECS world.
 * @param entity - Entity that owns `renderableComp` and `state`.
 * @param renderableComp - The renderable component to animate.
 * @param state - The element's interaction state.
 * @param base - Resting style applied before any state overrides.
 * @param config - Per-state style deltas.
 * @param transition - Duration and easing for all transitions.
 * @returns A cleanup function that unregisters all event listeners.
 */
export function createUiStateTransition(
  world: EcsWorld,
  entity: number,
  renderableComp: UiRenderableEcsComponent,
  state: UiStateEcsComponent,
  base: UiStyleOverride,
  config: UiStateStyleConfig,
  transition: UiTransitionSpec = defaultUiTransitionSpec,
): () => void {
  const { duration, easing } = transition;

  const handleTransition = (): void => {
    const target = computeUiTargetStyle(state, base, config);

    if (target.opacity !== undefined) {
      animateUiOpacity(world, entity, { to: target.opacity, duration, easing });
    }

    if (target.cornerRadius !== undefined) {
      animateUiCornerRadius(world, entity, {
        to: target.cornerRadius,
        duration,
        easing,
      });
    }

    if (target.borderWidth !== undefined) {
      animateUiBorderWidth(world, entity, {
        to: target.borderWidth,
        duration,
        easing,
      });
    }

    if (target.tintColor !== undefined) {
      animateUiTintColor(world, entity, {
        from: renderableComp.tintColor,
        to: target.tintColor,
        duration,
        easing,
      });
    }

    if (target.borderColor !== undefined) {
      animateUiBorderColor(world, entity, {
        from: renderableComp.borderColor,
        to: target.borderColor,
        duration,
        easing,
      });
    }
  };

  state.onHoverEnter.registerListener(handleTransition);
  state.onHoverExit.registerListener(handleTransition);
  state.onPressStart.registerListener(handleTransition);
  state.onPressEnd.registerListener(handleTransition);
  state.onFocus.registerListener(handleTransition);
  state.onBlur.registerListener(handleTransition);
  state.onDisabledChange.registerListener(handleTransition);

  return (): void => {
    state.onHoverEnter.deregisterListener(handleTransition);
    state.onHoverExit.deregisterListener(handleTransition);
    state.onPressStart.deregisterListener(handleTransition);
    state.onPressEnd.deregisterListener(handleTransition);
    state.onFocus.deregisterListener(handleTransition);
    state.onBlur.deregisterListener(handleTransition);
    state.onDisabledChange.deregisterListener(handleTransition);
  };
}
