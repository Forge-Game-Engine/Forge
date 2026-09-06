import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { RenderContext } from '../../rendering/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  denormalizeUiSliderValue,
  normalizeUiSliderValue,
  UiSliderEcsComponent,
  uiSliderId,
} from '../components/ui-slider-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { Rect } from '../../math/index.js';
import { driveUiAxis } from '../types/ui-axis.js';
import { UiPointerSource } from '../types/ui-pointer-source.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { resolveCanvasPointerPosition } from '../utilities/resolve-canvas-pointer-position.js';

/** Sets `slider.value` and raises `onValueChanged` if the value actually changed. */
function setSliderValue(slider: UiSliderEcsComponent, value: number): void {
  if (slider.value === value) {
    return;
  }

  slider.value = value;
  slider.onValueChanged.raise(value);
}

/**
 * While `interactable.pressCapture` is active, converts the pointer's
 * current position within `rect` into a value and applies it - the part of
 * the drag gesture that needs the owning canvas/pointer source, split out
 * from the per-entity loop below to keep it readable.
 */
function applyActiveDrag(
  world: EcsWorld,
  entity: number,
  slider: UiSliderEcsComponent,
  interactable: UiInteractableEcsComponent,
  rect: Rect,
  pointerSource: UiPointerSource,
  renderContext: RenderContext,
): void {
  if (interactable.pressCapture === null) {
    return;
  }

  const owningCanvasEntity = findOwningCanvas(world, entity);
  const canvas =
    owningCanvasEntity !== null
      ? world.getComponent<CanvasEcsComponent>(owningCanvasEntity, canvasId)
      : null;
  const pointerPosition = canvas
    ? resolveCanvasPointerPosition(world, canvas, renderContext, pointerSource)
    : null;

  if (!pointerPosition) {
    return;
  }

  const width = rect.max.x - rect.min.x;
  const t = width > 0 ? (pointerPosition.x - rect.min.x) / width : 0;

  setSliderValue(slider, denormalizeUiSliderValue(slider, t));
}

/** Drives the handle's (and, if present, the fill's) rect transform anchors from `slider.value`. */
function applySliderVisuals(
  world: EcsWorld,
  slider: UiSliderEcsComponent,
): void {
  const t = normalizeUiSliderValue(slider);

  const handleRectTransform = world.getComponent<RectTransformEcsComponent>(
    slider.handle,
    rectTransformId,
  );

  if (handleRectTransform) {
    driveUiAxis(handleRectTransform.x, t);
  }

  if (slider.fill !== undefined) {
    const fillRectTransform = world.getComponent<RectTransformEcsComponent>(
      slider.fill,
      rectTransformId,
    );

    if (fillRectTransform) {
      driveUiAxis(fillRectTransform.x, t);
    }
  }
}

/**
 * Creates a system that turns a drag on a `UiSliderEcsComponent`'s track
 * into a value: while the track's `UiInteractableEcsComponent` has an active
 * press (`pressCapture !== null`, so a drag that strays outside the track's
 * vertical bounds keeps tracking, and a plain click - not just a drag past
 * `dragThreshold` - jumps the handle to the click position), the pointer's
 * horizontal position within the track's resolved rect is normalized to
 * `[0, 1]` and denormalized back into `[minValue, maxValue]` (rounded when
 * `wholeNumbers` is set). Every tick, regardless of dragging, also re-derives
 * the handle's (and, if present, the fill's) rect transform anchors from the
 * current `value`, so an external `slider.value =` write is reflected the
 * same way a drag is.
 *
 * Because `createUiLayoutEcsSystem` runs before the interaction pipeline
 * each tick (it must, so raycasting has this tick's resolved rects to test
 * against), a value change here - from a drag or an external write - is
 * only picked up by layout on the *next* tick, one frame later; imperceptible
 * at normal frame rates, and the same lag `createUiTransitionEcsSystem`
 * already has relative to the interaction state it eases from.
 *
 * Must be registered after `createUiInteractionEcsSystem` (it reads
 * `pressCapture`, which that system writes). `createUiCanvas` does this for
 * you whenever a `pointerSource` is supplied.
 * @param pointerSource - The pointer source dragged against.
 * @param renderContext - The render context canvases' cameras render
 * through, used to convert the pointer position.
 * @returns The UI slider ECS system.
 */
export const createUiSliderEcsSystem = (
  pointerSource: UiPointerSource,
  renderContext: RenderContext,
): EcsSystem<
  [UiSliderEcsComponent, UiInteractableEcsComponent, RectTransformEcsComponent]
> => ({
  name: 'uiSlider',
  query: [uiSliderId, uiInteractableId, rectTransformId],
  update: (
    world,
    { entities, components: [sliders, interactables, rectTransforms] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const slider = sliders[i];
      const interactable = interactables[i];

      applyActiveDrag(
        world,
        entities[i],
        slider,
        interactable,
        rectTransforms[i].rect,
        pointerSource,
        renderContext,
      );

      applySliderVisuals(world, slider);
    }
  },
});
