import { createComponentId } from '../../ecs/ecs-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Payload for {@link UiSliderEcsComponent} change events.
 */
export interface UiSliderChangeEvent {
  /** The slider root entity. */
  entity: number;
  /** The new slider value, clamped to `[min, max]` and snapped to `step`. */
  value: number;
}

/**
 * Stores slider state and events for a slider widget.
 *
 * Attached to the root (track) entity created by {@link createUiSlider}.
 * The slider ECS system reads this component to drive drag, track-click, and
 * keyboard interactions.
 */
export interface UiSliderEcsComponent {
  /** Current value, clamped to `[min, max]`. */
  value: number;

  /** Minimum value (inclusive). */
  min: number;

  /** Maximum value (inclusive). */
  max: number;

  /**
   * Snap interval. When set, value is snapped to the nearest multiple of `step`
   * relative to `min`. `undefined` means continuous (no snapping).
   */
  step?: number;

  /** Whether the slider is laid out horizontally or vertically. */
  orientation: 'horizontal' | 'vertical';

  /** Raised every frame the value changes during drag or per keyboard step. */
  onChange: ParameterizedForgeEvent<UiSliderChangeEvent>;

  /** Raised when an interaction begins (drag press or keyboard key-down). */
  onChangeStart: ParameterizedForgeEvent<UiSliderChangeEvent>;

  /** Raised when an interaction ends (drag release or keyboard key-up). */
  onChangeEnd: ParameterizedForgeEvent<UiSliderChangeEvent>;

  /**
   * Entity id of the knob child. Set by {@link createUiSlider}; read each frame
   * by the slider system to detect drag and reposition the knob.
   */
  knobEntity: number;

  /**
   * Entity id of the fill child. Set by {@link createUiSlider}; updated each
   * frame by the slider system to reflect the current value.
   */
  fillEntity: number;

  /** Set to `true` while a drag interaction is in progress. */
  isDragging: boolean;
}

/** Component id for {@link UiSliderEcsComponent}. */
export const uiSliderId = createComponentId<UiSliderEcsComponent>('ui-slider');
