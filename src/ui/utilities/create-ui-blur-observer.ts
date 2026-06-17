import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/parameterized-forge-event.js';
import { Vector2 } from '../../math/index.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import { uiStateId } from '../components/ui-state-component.js';
import { UiCanvasResizeEventData } from './create-ui-resize-observer.js';
import { setFocus } from './set-focus.js';

/**
 * Configures what the blur observer clears for each type of focus-loss event.
 * All fields default to sensible values via {@link defaultUiBlurPolicy}.
 */
export interface UiBlurPolicy {
  /** Clear the hovered element when the game container loses browser focus. */
  clearHoverOnContainerBlur: boolean;
  /** Clear the pressed element when the game container loses browser focus. */
  clearPressOnContainerBlur: boolean;
  /** Clear keyboard focus when the game container loses browser focus. */
  clearFocusOnContainerBlur: boolean;

  /** Clear the hovered element when the browser tab is hidden or the window loses focus. */
  clearHoverOnTabBlur: boolean;
  /** Clear the pressed element when the browser tab is hidden or the window loses focus. */
  clearPressOnTabBlur: boolean;
  /** Clear keyboard focus when the browser tab is hidden or the window loses focus. */
  clearFocusOnTabBlur: boolean;

  /** Clear the hovered element when the pointer leaves the container bounds. */
  clearHoverOnMouseLeave: boolean;
  /** Clear the pressed element when the pointer leaves the container bounds. */
  clearPressOnMouseLeave: boolean;

  /** Clear the hovered element after a canvas resize (stale hover under a moved element). */
  clearHoverOnResize: boolean;
  /** Clear the pressed element after a canvas resize. */
  clearPressOnResize: boolean;
}

/**
 * Sensible defaults for {@link UiBlurPolicy}.
 *
 * | Event             | hover | press | focus |
 * |-------------------|-------|-------|-------|
 * | container blur    | clear | clear | keep  |
 * | tab / win blur    | clear | clear | keep  |
 * | mouse leave       | clear | clear | —     |
 * | canvas resize     | clear | clear | —     |
 */
export const defaultUiBlurPolicy: UiBlurPolicy = {
  clearHoverOnContainerBlur: true,
  clearPressOnContainerBlur: true,
  clearFocusOnContainerBlur: false,

  clearHoverOnTabBlur: true,
  clearPressOnTabBlur: true,
  clearFocusOnTabBlur: false,

  clearHoverOnMouseLeave: true,
  clearPressOnMouseLeave: true,

  clearHoverOnResize: true,
  clearPressOnResize: true,
};

/** Options for {@link createUiBlurObserver}. */
export interface CreateUiBlurObserverOptions {
  /** Override individual policy flags. Merged with {@link defaultUiBlurPolicy}. */
  policy?: Partial<UiBlurPolicy>;

  /**
   * The `onResize` event from a {@link UiResizeObserver}. When provided, the
   * observer applies the resize policy when the canvas changes size.
   */
  onResize?: ParameterizedForgeEvent<UiCanvasResizeEventData>;
}

/** Handle returned by {@link createUiBlurObserver}. */
export interface UiBlurObserver {
  /** Removes all DOM listeners and the resize event listener. Call on world teardown. */
  stop(): void;
}

function clearInteractionState(
  world: EcsWorld,
  canvasEntity: number,
  options: { clearHover: boolean; clearPress: boolean; clearFocus: boolean },
): void {
  const pointerState = world.getComponent(canvasEntity, uiPointerStateId);
  const pointer = pointerState?.pointer ?? Vector2.zero;

  if (options.clearHover && pointerState?.hovered != null) {
    const hoveredState = world.getComponent(pointerState.hovered, uiStateId);

    if (hoveredState?.hovered) {
      hoveredState.hovered = false;
      hoveredState.onHoverExit.raise({
        entity: pointerState.hovered,
        pointer,
        source: 'pointer',
      });
    }

    pointerState.hovered = null;
  }

  if (options.clearPress && pointerState?.pressed != null) {
    const pressedState = world.getComponent(pointerState.pressed, uiStateId);

    if (pressedState?.pressed) {
      pressedState.pressed = false;
      pressedState.onPressEnd.raise({
        entity: pointerState.pressed,
        pointer,
        source: 'pointer',
      });
    }

    pointerState.pressed = null;
  }

  if (options.clearFocus) {
    setFocus(world, canvasEntity, null, 'pointer');
  }
}

/**
 * Creates an observer that clears UI interaction state when the browser context
 * changes — container focus loss, tab/window blur, pointer leaving the canvas,
 * or a canvas resize. This is the single sanctioned DOM integration point for
 * blur-related behaviour; widgets must not add their own DOM listeners.
 *
 * The policy determines what is cleared for each event type and defaults to
 * {@link defaultUiBlurPolicy}. All DOM listeners are removed when `stop()` is
 * called, preventing leaks across world/scene teardown.
 *
 * @param world - The ECS world.
 * @param canvasEntity - The UI canvas root entity.
 * @param container - The game container element.
 * @param options - Optional policy overrides and resize event hook.
 * @returns A handle with a `stop()` method for teardown.
 */
export function createUiBlurObserver(
  world: EcsWorld,
  canvasEntity: number,
  container: HTMLElement,
  options: CreateUiBlurObserverOptions = {},
): UiBlurObserver {
  const policy: UiBlurPolicy = {
    ...defaultUiBlurPolicy,
    ...options.policy,
  };

  const onContainerBlur = () => {
    clearInteractionState(world, canvasEntity, {
      clearHover: policy.clearHoverOnContainerBlur,
      clearPress: policy.clearPressOnContainerBlur,
      clearFocus: policy.clearFocusOnContainerBlur,
    });
  };

  const onWindowBlur = () => {
    clearInteractionState(world, canvasEntity, {
      clearHover: policy.clearHoverOnTabBlur,
      clearPress: policy.clearPressOnTabBlur,
      clearFocus: policy.clearFocusOnTabBlur,
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      clearInteractionState(world, canvasEntity, {
        clearHover: policy.clearHoverOnTabBlur,
        clearPress: policy.clearPressOnTabBlur,
        clearFocus: policy.clearFocusOnTabBlur,
      });
    }
  };

  const onMouseLeave = () => {
    clearInteractionState(world, canvasEntity, {
      clearHover: policy.clearHoverOnMouseLeave,
      clearPress: policy.clearPressOnMouseLeave,
      clearFocus: false,
    });
  };

  const onResize = () => {
    clearInteractionState(world, canvasEntity, {
      clearHover: policy.clearHoverOnResize,
      clearPress: policy.clearPressOnResize,
      clearFocus: false,
    });
  };

  container.addEventListener('blur', onContainerBlur, true);
  container.addEventListener('focusout', onContainerBlur, true);
  container.addEventListener('mouseleave', onMouseLeave);
  globalThis.addEventListener('blur', onWindowBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);

  options.onResize?.registerListener(onResize);

  return {
    stop(): void {
      container.removeEventListener('blur', onContainerBlur, true);
      container.removeEventListener('focusout', onContainerBlur, true);
      container.removeEventListener('mouseleave', onMouseLeave);
      globalThis.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      options.onResize?.deregisterListener(onResize);
    },
  };
}
