import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../../input/input-manager.js';
import { clamp } from '../../math/index.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';
import { uiPointerStateId } from '../components/ui-pointer-state-component.js';
import {
  UiSliderChangeEvent,
  UiSliderEcsComponent,
  uiSliderId,
} from '../components/ui-slider-component.js';
import { uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { uiInputActionNames } from '../utilities/register-ui-input-actions.js';

/** Name of the extra Home action used by the slider system. */
export const uiSliderHomeActionName = 'ui.sliderHome';

/** Name of the extra End action used by the slider system. */
export const uiSliderEndActionName = 'ui.sliderEnd';

const canvasBuffer: number[] = [];

/** Applies optional step snapping to a raw value relative to `min`. */
function snapToStep(
  value: number,
  min: number,
  step: number | undefined,
): number {
  if (step === undefined || step <= 0) {
    return value;
  }

  return min + Math.round((value - min) / step) * step;
}

/** Updates the fill and knob transforms to reflect the current normalised value. */
function applyNormalizedValue(
  world: EcsWorld,
  slider: UiSliderEcsComponent,
  normalizedValue: number,
): void {
  const { fillEntity, knobEntity, orientation } = slider;

  const fillTransform = world.getComponent(fillEntity, uiTransformId);

  if (fillTransform) {
    if (orientation === 'horizontal') {
      fillTransform.anchorMax.x = normalizedValue;
    } else {
      fillTransform.anchorMax.y = normalizedValue;
    }

    fillTransform.isDirty = true;
  }

  const knobTransform = world.getComponent(knobEntity, uiTransformId);

  if (knobTransform) {
    if (orientation === 'horizontal') {
      knobTransform.anchorMin.x = normalizedValue;
      knobTransform.anchorMax.x = normalizedValue;
    } else {
      knobTransform.anchorMin.y = normalizedValue;
      knobTransform.anchorMax.y = normalizedValue;
    }

    knobTransform.isDirty = true;
  }
}

function computeNormalizedFromPointer(
  world: EcsWorld,
  sliderEntity: number,
  slider: UiSliderEcsComponent,
  pointerX: number,
  pointerY: number,
): number {
  const trackTransform = world.getComponent(sliderEntity, uiTransformId);

  if (!trackTransform) {
    return 0;
  }

  const { resolvedRect } = trackTransform;

  if (slider.orientation === 'horizontal') {
    const localX = pointerX - resolvedRect.origin.x;
    const trackWidth = resolvedRect.size.x;

    if (trackWidth <= 0) {
      return 0;
    }

    return clamp(localX / trackWidth, 0, 1);
  }

  const localY = pointerY - resolvedRect.origin.y;
  const trackHeight = resolvedRect.size.y;

  if (trackHeight <= 0) {
    return 0;
  }

  return clamp(localY / trackHeight, 0, 1);
}

function applyValueChange(
  world: EcsWorld,
  sliderEntity: number,
  slider: UiSliderEcsComponent,
  newValue: number,
): void {
  const clamped = clamp(newValue, slider.min, slider.max);
  const stepped = snapToStep(clamped, slider.min, slider.step);
  const finalValue = clamp(stepped, slider.min, slider.max);

  if (finalValue === slider.value) {
    return;
  }

  slider.value = finalValue;

  const normalizedValue =
    slider.max > slider.min
      ? (finalValue - slider.min) / (slider.max - slider.min)
      : 0;

  applyNormalizedValue(world, slider, normalizedValue);

  const event: UiSliderChangeEvent = {
    entity: sliderEntity,
    value: finalValue,
  };

  slider.onChange.raise(event);
}

function handleDrag(
  world: EcsWorld,
  sliderEntity: number,
  slider: UiSliderEcsComponent,
  pointerX: number,
  pointerY: number,
): void {
  const knobState = world.getComponent(slider.knobEntity, uiStateId);

  if (!knobState) {
    return;
  }

  const wasPressed = knobState.pressed;
  const isDragging = slider.isDragging;

  if (wasPressed && !isDragging) {
    slider.isDragging = true;
    slider.onChangeStart.raise({ entity: sliderEntity, value: slider.value });
  }

  if (!wasPressed && isDragging) {
    slider.isDragging = false;
    slider.onChangeEnd.raise({ entity: sliderEntity, value: slider.value });

    return;
  }

  if (wasPressed) {
    const normalized = computeNormalizedFromPointer(
      world,
      sliderEntity,
      slider,
      pointerX,
      pointerY,
    );

    const rawValue = slider.min + normalized * (slider.max - slider.min);

    applyValueChange(world, sliderEntity, slider, rawValue);
  }
}

function handleTrackClick(
  world: EcsWorld,
  sliderEntity: number,
  slider: UiSliderEcsComponent,
): void {
  const trackState = world.getComponent(sliderEntity, uiStateId);

  if (!trackState || slider.isDragging) {
    return;
  }

  const knobState = world.getComponent(slider.knobEntity, uiStateId);

  const wasTrackClick = trackState.pressed && !(knobState?.pressed ?? false);

  if (wasTrackClick) {
    const pointerState = (() => {
      world.queryEntities([uiCanvasId, uiPointerStateId], canvasBuffer);

      if (canvasBuffer.length === 0) {
        return null;
      }

      return world.getComponent(canvasBuffer[0], uiPointerStateId);
    })();

    if (!pointerState) {
      return;
    }

    const normalized = computeNormalizedFromPointer(
      world,
      sliderEntity,
      slider,
      pointerState.pointer.x,
      pointerState.pointer.y,
    );

    const rawValue = slider.min + normalized * (slider.max - slider.min);

    applyValueChange(world, sliderEntity, slider, rawValue);
  }
}

function computeAxisDelta(
  orientation: 'horizontal' | 'vertical',
  stepSize: number,
  tryTrigger: (name: string) => boolean,
): number {
  if (orientation === 'horizontal') {
    if (tryTrigger(uiInputActionNames.navigateRight)) {
      return stepSize;
    }

    if (tryTrigger(uiInputActionNames.navigateLeft)) {
      return -stepSize;
    }

    return 0;
  }

  if (tryTrigger(uiInputActionNames.navigateDown)) {
    return stepSize;
  }

  if (tryTrigger(uiInputActionNames.navigateUp)) {
    return -stepSize;
  }

  return 0;
}

function handleKeyboard(
  world: EcsWorld,
  sliderEntity: number,
  slider: UiSliderEcsComponent,
  inputManager: InputManager,
): void {
  const knobState = world.getComponent(slider.knobEntity, uiStateId);

  if (!knobState?.focused) {
    return;
  }

  const stepSize = slider.step ?? (slider.max - slider.min) / 10;

  const tryTrigger = (name: string): boolean => {
    try {
      return inputManager.getTriggerAction(name).isTriggered;
    } catch {
      return false;
    }
  };

  const delta = computeAxisDelta(slider.orientation, stepSize, tryTrigger);

  if (tryTrigger(uiSliderHomeActionName)) {
    const newValue = slider.min;

    if (newValue !== slider.value) {
      slider.onChangeStart.raise({ entity: sliderEntity, value: slider.value });
      applyValueChange(world, sliderEntity, slider, newValue);
      slider.onChangeEnd.raise({ entity: sliderEntity, value: slider.value });
    }

    return;
  }

  if (tryTrigger(uiSliderEndActionName)) {
    const newValue = slider.max;

    if (newValue !== slider.value) {
      slider.onChangeStart.raise({ entity: sliderEntity, value: slider.value });
      applyValueChange(world, sliderEntity, slider, newValue);
      slider.onChangeEnd.raise({ entity: sliderEntity, value: slider.value });
    }

    return;
  }

  if (delta !== 0) {
    slider.onChangeStart.raise({ entity: sliderEntity, value: slider.value });
    applyValueChange(world, sliderEntity, slider, slider.value + delta);
    slider.onChangeEnd.raise({ entity: sliderEntity, value: slider.value });
  }
}

/**
 * Creates the UI slider ECS system (Feature F5.4).
 *
 * The system drives drag, track-click, and keyboard interactions for all
 * entities with {@link UiSliderEcsComponent}. Add it to the world **after**
 * the layout system so the knob and fill positions are resolved before the
 * next render.
 *
 * Drag interaction:
 * - While the knob is pressed, the pointer position is projected onto the
 *   track axis and converted to a normalised value.
 * - `onChangeStart` fires when the drag begins; `onChangeEnd` when released.
 *
 * Track click:
 * - Clicking the track (not the knob) jumps the value to the click position.
 *
 * Keyboard (when knob is focused):
 * - Arrow keys in the primary axis adjust by `step` (or 10% of range).
 * - `ui.sliderHome` / `ui.sliderEnd` jump to `min` / `max`.
 *
 * @param inputManager - The input manager used to read navigation actions.
 * @returns The slider ECS system.
 */
export const createUiSliderEcsSystem = (
  inputManager: InputManager,
): EcsSystem<[UiSliderEcsComponent]> => ({
  query: [uiSliderId],

  run: (result, world: EcsWorld): void => {
    const sliderEntity = result.entity;
    const [slider] = result.components;

    world.queryEntities([uiCanvasId, uiPointerStateId], canvasBuffer);

    if (canvasBuffer.length === 0) {
      return;
    }

    const pointerState = world.getComponent(canvasBuffer[0], uiPointerStateId);

    if (!pointerState) {
      return;
    }

    handleDrag(
      world,
      sliderEntity,
      slider,
      pointerState.pointer.x,
      pointerState.pointer.y,
    );

    handleTrackClick(world, sliderEntity, slider);

    handleKeyboard(world, sliderEntity, slider, inputManager);
  },
});
