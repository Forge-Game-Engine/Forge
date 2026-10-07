import { PositionEcsComponent, positionId, Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { TextEntry } from '../../input/text-entry/text-entry.js';
import { Vector2 } from '../../math/index.js';
import {
  CameraEcsComponent,
  cameraId,
  computeCameraView,
  RenderContext,
  VisibilityEcsComponent,
  visibilityId,
} from '../../rendering/index.js';
import {
  TextEcsComponent,
  textId,
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  TextInputEcsComponent,
  textInputId,
} from '../components/text-input-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { raycastUiCanvas } from '../utilities/raycast-ui-canvas.js';
import { resolveCanvasGroupState } from '../utilities/resolve-canvas-group-state.js';

/** How long the caret stays visible, then hidden, in each blink. */
const caretBlinkHalfPeriodMilliseconds = 530;

const primaryButton = 0;

/** What the caret was last drawn for, to restart its blink on any change. */
interface CaretState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  isEditing: boolean;
  elapsedMilliseconds: number;
}

/**
 * Removes the characters `glyphs` has no glyph for, keeping spaces, so a
 * field never holds a character the player can't see.
 */
function keepDrawableCharacters(
  text: string,
  glyphs: ReadonlyMap<number, unknown>,
): string {
  let kept = '';

  for (const character of text) {
    if (character === ' ' || glyphs.has(character.codePointAt(0) as number)) {
      kept += character;
    }
  }

  return kept;
}

/**
 * Runs `text` through a field's filters: the font's glyphs, then the
 * field's own `filter`, then `maxLength`.
 */
function filterText(
  text: string,
  textInput: TextInputEcsComponent,
  glyphs: ReadonlyMap<number, unknown>,
): string {
  const drawable = keepDrawableCharacters(text, glyphs);
  const filtered = textInput.filter ? textInput.filter(drawable) : drawable;

  return Number.isFinite(textInput.maxLength)
    ? filtered.slice(0, Math.max(0, textInput.maxLength))
    : filtered;
}

/**
 * Accepts the entry's text into `value` once it isn't mid-composition:
 * filters it, writes the filtered text back to the entry (keeping the caret
 * after the same characters) and raises `onValueChanged` if it changed.
 */
function mirrorValue(
  textInput: TextInputEcsComponent,
  glyphs: ReadonlyMap<number, unknown>,
): void {
  const { entry } = textInput;

  if (entry.composition !== null || entry.value === textInput.value) {
    return;
  }

  const filtered = filterText(entry.value, textInput, glyphs);

  if (filtered !== entry.value) {
    const caret = Math.min(
      filterText(entry.value.slice(0, entry.selectionEnd), textInput, glyphs)
        .length,
      filtered.length,
    );

    entry.setValue(filtered);
    entry.setSelection(caret, caret);
  }

  if (filtered === textInput.value) {
    return;
  }

  textInput.value = filtered;
  textInput.onValueChanged.raise(filtered);
}

function setVisible(world: EcsWorld, entity: number, visible: boolean): void {
  const visibility = world.getComponent<VisibilityEcsComponent>(
    entity,
    visibilityId,
  );

  if (visibility) {
    visibility.visible = visible;
  }
}

/**
 * Places one of a field's visual parts relative to the text's origin, and
 * sizes it on whichever axes are given. The parts are children of a
 * zero-size origin entity, so `anchoredPosition` is an offset from it.
 */
function placePart(
  world: EcsWorld,
  entity: number,
  position: Vector2,
  size: { x?: number; y?: number },
): void {
  const rectTransform = world.getComponent<RectTransformEcsComponent>(
    entity,
    rectTransformId,
  );

  if (!rectTransform) {
    return;
  }

  rectTransform.anchoredPosition.x = position.x;
  rectTransform.anchoredPosition.y = position.y;

  if (size.x !== undefined && rectTransform.x.kind === 'point') {
    rectTransform.x.size = size.x;
  }

  if (size.y !== undefined && rectTransform.y.kind === 'point') {
    rectTransform.y.size = size.y;
  }
}

/**
 * Converts a field's resolved rect (its canvas's UI world space) to CSS
 * pixels relative to the canvas, through the canvas's camera. `null` for a
 * field not on a screen-space canvas, or whose camera can't give a view.
 */
function toCanvasCssRect(
  world: EcsWorld,
  entity: number,
  rectTransform: RectTransformEcsComponent,
  renderContext: RenderContext,
): { left: number; top: number; width: number; height: number } | null {
  const canvasEntity = findOwningCanvas(world, entity);
  const canvas =
    canvasEntity === null
      ? null
      : world.getComponent<CanvasEcsComponent>(canvasEntity, canvasId);

  if (!canvas || canvas.renderMode !== uiCanvasRenderModes.screenSpace) {
    return null;
  }

  const camera = world.getComponent<CameraEcsComponent>(
    canvas.camera,
    cameraId,
  );
  const cameraPosition = world.getComponent<PositionEcsComponent>(
    canvas.camera,
    positionId,
  );

  if (!camera || !cameraPosition) {
    return null;
  }

  const view = computeCameraView(camera, cameraPosition, renderContext);
  const { min, max } = rectTransform.rect;
  const topLeft = view.worldToViewport({ x: min.x, y: max.y });
  const bottomRight = view.worldToViewport({ x: max.x, y: min.y });

  return {
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Creates the system that runs every `TextInputEcsComponent`: it decides
 * when a field is being edited, mirrors and filters its value, raises its
 * events, keeps its hidden input over it on screen, and draws its text,
 * placeholder, caret, selection and IME composition underline.
 *
 * **Editing.** A field is being edited exactly while its hidden input has
 * focus. Editing starts when the field is invoked (a click, a tap, or the
 * canvas's `submitInput` while it has UI focus) or through
 * `editTextInput`, and ends on Enter (`onSubmit`), Escape (`onCancel`), or
 * when the browser takes focus away (a click elsewhere, a phone's "Done"
 * key, switching tabs). Hovering or navigating to another element doesn't
 * end it. A field that isn't interactable (itself or through a canvas
 * group) can't be edited.
 *
 * **Phone keyboards.** A phone only opens its keyboard when an input is
 * focused inside a user gesture's event handler, and an ECS tick runs
 * later. So the system listens for `pointerup` on the canvas's container
 * and runs the UI's own hit test (`raycastUiCanvas`) right there: if the
 * press and release both landed on the same field, and it's the only
 * element hit on any canvas, its input is focused inside the gesture.
 *
 * **Value.** Outside an IME composition, the input's text is filtered
 * (characters the field's font has no glyph for are dropped, then the
 * field's `filter` runs, then `maxLength` applies), written back to the
 * input if filtering changed it, and copied to `value`, raising
 * `onValueChanged`. During a composition the uncommitted text is shown,
 * underlined, but isn't part of `value`.
 *
 * **Visuals.** The caret and selection are placed from the text label's
 * `TextMeshEcsComponent.caretStops`. Text shaping and layout run after
 * this system, so they trail the typed text by a frame or two. The caret
 * blinks, restarting whenever the text or selection changes.
 *
 * Fields on world-space canvases are edited and drawn the same way, but
 * their hidden input isn't moved over them.
 *
 * Every field's input is removed when its component is, and all of them
 * are removed in `cleanup`.
 *
 * Must be registered after `createUiNavigationEcsSystem` and
 * `createUiInteractionEcsSystem` (it reads `wasInvokedThisFrame`), which
 * `registerUiSystems` does.
 * @param renderContext - The render context whose canvas the fields are
 * drawn on. Its canvas's parent element receives the tap listeners.
 * @param time - The time the caret blinks by. It uses unscaled time, so
 * the caret blinks while the game is paused.
 * @returns The UI text input ECS system.
 */
export const createUiTextInputEcsSystem = (
  renderContext: RenderContext,
  time: Time,
): EcsSystem<
  [TextInputEcsComponent, UiInteractableEcsComponent, RectTransformEcsComponent]
> => {
  const entries = new Map<TextInputEcsComponent, TextEntry>();
  const caretStates = new WeakMap<TextInputEcsComponent, CaretState>();
  let currentWorld: EcsWorld | null = null;
  let container: HTMLElement | null = null;
  let pressedField: number | null = null;

  const toViewportPosition = (event: MouseEvent): Vector2 => {
    const bounds = renderContext.canvas.getBoundingClientRect();

    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const isEditable = (world: EcsWorld, entity: number): boolean => {
    const interactable = world.getComponent<UiInteractableEcsComponent>(
      entity,
      uiInteractableId,
    );

    return (
      !!interactable &&
      interactable.interactable &&
      resolveCanvasGroupState(world, entity).interactable
    );
  };

  /**
   * The text field under a pointer event, or `null`. Only counts when it's
   * the single element hit across every canvas, so a field under an
   * element on another canvas is never edited by mistake.
   */
  const findFieldAt = (event: MouseEvent): number | null => {
    if (!currentWorld) {
      return null;
    }

    const world = currentWorld;
    const viewportPosition = toViewportPosition(event);
    const hits: number[] = [];

    for (const canvasEntity of world.query([canvasId]).entities) {
      const hit = raycastUiCanvas(
        world,
        canvasEntity,
        renderContext,
        viewportPosition,
      );

      if (hit !== null) {
        hits.push(hit);
      }
    }

    if (hits.length !== 1) {
      return null;
    }

    const [hit] = hits;

    return world.getComponent(hit, textInputId) && isEditable(world, hit)
      ? hit
      : null;
  };

  const onPointerDown = (event: PointerEvent): void => {
    pressedField = event.button === primaryButton ? findFieldAt(event) : null;
  };

  // Pressing anywhere that isn't focusable moves the browser's focus to the
  // page, which would end editing for a moment when the player presses the
  // field they're typing in. A pressed field keeps focus where it is
  // instead; the release then focuses it.
  const onMouseDown = (event: MouseEvent): void => {
    if (findFieldAt(event) !== null) {
      event.preventDefault();
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    const field = pressedField;

    pressedField = null;

    if (
      !currentWorld ||
      field === null ||
      event.button !== primaryButton ||
      findFieldAt(event) !== field
    ) {
      return;
    }

    currentWorld
      .getComponentRequired<TextInputEcsComponent>(field, textInputId)
      .entry.focus();
  };

  const listen = (): void => {
    if (container) {
      return;
    }

    container = renderContext.canvas.parentElement;
    container?.addEventListener('pointerdown', onPointerDown);
    container?.addEventListener('mousedown', onMouseDown);
    container?.addEventListener('pointerup', onPointerUp);
  };

  const updateEditing = (
    world: EcsWorld,
    entity: number,
    textInput: TextInputEcsComponent,
    interactable: UiInteractableEcsComponent,
  ): void => {
    const { entry } = textInput;
    const editable = isEditable(world, entity);

    if (!editable && entry.isFocused) {
      entry.blur();
    }

    if (editable && interactable.wasInvokedThisFrame && !entry.isFocused) {
      entry.focus();
    }
  };

  const updateVisuals = (
    world: EcsWorld,
    textInput: TextInputEcsComponent,
  ): void => {
    const { entry } = textInput;
    const label = world.getComponentRequired<TextEcsComponent>(
      textInput.textLabel,
      textId,
    );
    const displayedText =
      entry.composition === null ? textInput.value : entry.value;

    label.text = displayedText;

    setVisible(world, textInput.placeholderLabel, displayedText.length === 0);

    const caretStops =
      world.getComponent<TextMeshEcsComponent>(textInput.textLabel, textMeshId)
        ?.caretStops ?? [];
    const stopAt = (index: number): Vector2 =>
      caretStops[Math.min(index, caretStops.length - 1)] ?? { x: 0, y: 0 };

    const { ascender, descender } = label.fontAtlas.data.metrics;
    const lineBottom = descender * label.size;
    const lineHeight = (ascender - descender) * label.size;
    const start = Math.min(entry.selectionStart, entry.selectionEnd);
    const end = Math.max(entry.selectionStart, entry.selectionEnd);

    const caretStop = stopAt(entry.selectionEnd);

    placePart(
      world,
      textInput.caret,
      { x: caretStop.x, y: caretStop.y + lineBottom },
      { y: lineHeight },
    );
    setVisible(
      world,
      textInput.caret,
      textInput.isEditing &&
        start === end &&
        isCaretBlinkVisible(textInput, displayedText, start, end),
    );

    const selectionStart = stopAt(start);

    placePart(
      world,
      textInput.selection,
      { x: selectionStart.x, y: selectionStart.y + lineBottom },
      { x: stopAt(end).x - selectionStart.x, y: lineHeight },
    );
    setVisible(
      world,
      textInput.selection,
      textInput.isEditing && start !== end,
    );

    const { composition } = entry;

    if (composition !== null) {
      const compositionStart = stopAt(composition.start);

      placePart(
        world,
        textInput.compositionUnderline,
        {
          x: compositionStart.x,
          y: compositionStart.y + lineBottom / 2,
        },
        { x: stopAt(composition.end).x - compositionStart.x },
      );
    }

    setVisible(world, textInput.compositionUnderline, composition !== null);
  };

  /** Advances the caret's blink, restarting it when anything it's drawn for changed. */
  const isCaretBlinkVisible = (
    textInput: TextInputEcsComponent,
    text: string,
    selectionStart: number,
    selectionEnd: number,
  ): boolean => {
    const previous = caretStates.get(textInput);
    const unchanged =
      previous &&
      previous.text === text &&
      previous.selectionStart === selectionStart &&
      previous.selectionEnd === selectionEnd &&
      previous.isEditing === textInput.isEditing;
    const elapsedMilliseconds = unchanged
      ? previous.elapsedMilliseconds + time.rawDeltaTimeInMilliseconds
      : 0;

    caretStates.set(textInput, {
      text,
      selectionStart,
      selectionEnd,
      isEditing: textInput.isEditing,
      elapsedMilliseconds,
    });

    return (
      elapsedMilliseconds % (caretBlinkHalfPeriodMilliseconds * 2) <
      caretBlinkHalfPeriodMilliseconds
    );
  };

  return {
    name: 'uiTextInput',
    query: [textInputId, uiInteractableId, rectTransformId],
    update: (
      world,
      { entities, components: [textInputs, interactables, rectTransforms] },
    ) => {
      currentWorld = world;

      const current = new Set<TextInputEcsComponent>();

      if (entities.length > 0) {
        listen();
      }

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const textInput = textInputs[i];
        const { entry } = textInput;

        current.add(textInput);
        entries.set(textInput, entry);

        // `maxLength` isn't passed on as the input's `maxlength`: the
        // browser would count characters the filters are about to remove,
        // so the field applies it itself, after filtering.
        entry.setAttributes(textInput.attributes);

        updateEditing(world, entity, textInput, interactables[i]);

        const events = entry.takeEvents();
        const label = world.getComponentRequired<TextEcsComponent>(
          textInput.textLabel,
          textId,
        );

        mirrorValue(textInput, label.fontAtlas.data.glyphs);

        if (events.submitted) {
          entry.blur();
          textInput.onSubmit.raise(textInput.value);
        }

        if (events.cancelled) {
          entry.blur();
          textInput.onCancel.raise();
        }

        textInput.isEditing = entry.isFocused;

        const screenRect = toCanvasCssRect(
          world,
          entity,
          rectTransforms[i],
          renderContext,
        );

        if (screenRect) {
          // The rect is relative to the canvas; the input is positioned in
          // the canvas's container, which the entry made its offset parent.
          entry.setScreenRect({
            ...screenRect,
            left: screenRect.left + renderContext.canvas.offsetLeft,
            top: screenRect.top + renderContext.canvas.offsetTop,
          });
        }

        updateVisuals(world, textInput);
      }

      for (const [textInput, entry] of entries) {
        if (!current.has(textInput)) {
          entry.dispose();
          entries.delete(textInput);
        }
      }
    },
    cleanup: () => {
      container?.removeEventListener('pointerdown', onPointerDown);
      container?.removeEventListener('mousedown', onMouseDown);
      container?.removeEventListener('pointerup', onPointerUp);
      container = null;
      currentWorld = null;

      for (const entry of entries.values()) {
        entry.dispose();
      }

      entries.clear();
    },
  };
};
