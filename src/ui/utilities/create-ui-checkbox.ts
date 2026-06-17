import { parentId } from '../../common/components/parent-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import {
  defaultUiStyleOptions,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import {
  createUiState,
  UiStateEcsComponent,
  uiStateId,
} from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  createUiCheckboxState,
  UiCheckboxChangeEvent,
  UiCheckboxEcsComponent,
  uiCheckboxId,
} from '../components/ui-checkbox-component.js';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiCheckbox}.
 */
export interface CreateUiCheckboxOptions {
  /**
   * Shared renderable for the checkbox box background.
   * Use {@link createUiRenderable} and share across checkboxes for batching.
   */
  renderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the check mark indicator (inner fill).
   * May be the same instance as `renderable` if no visual separation is needed.
   */
  checkRenderable: Renderable<UiInstanceComponents>;

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Position and size of the box relative to the anchor point. */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /** Direct offset for stretch-anchor mode. Used when `rect` is absent. */
  offsetMin?: Vector2;

  /** Direct offset for stretch-anchor mode. Used when `rect` is absent. */
  offsetMax?: Vector2;

  /** Normalised (0–1) pivot point. Defaults to `(0.5, 0.5)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Defaults to `(1, 1)`. */
  scale?: Vector2;

  /** Parent entity id. */
  parent?: number;

  // ── Box style ─────────────────────────────────────────────────────────────

  /** Box background colour. Defaults to `Color.white`. */
  tintColor?: Color;

  /** Box border colour. Defaults to `Color.transparent`. */
  borderColor?: Color;

  /** Box border width in CSS pixels. Default `0`. */
  borderWidth?: number;

  /** Box corner radius in CSS pixels. Default `0`. */
  cornerRadius?: number;

  /** Box opacity multiplier (0–1). Default `1`. */
  opacity?: number;

  /** Draw order within the canvas. Default `0`. */
  zIndex?: number;

  /** Per-state box style overrides (hover, pressed, focused, disabled). */
  stateStyles?: UiStateStyleConfig;

  // ── Check mark style ──────────────────────────────────────────────────────

  /**
   * Check mark colour. Defaults to `Color.black`.
   * The check entity is a child panel inset inside the box.
   */
  checkColor?: Color;

  /**
   * Inset in pixels on each side of the check mark relative to the box.
   * Default `4`.
   */
  checkInset?: number;

  // ── Behaviour ─────────────────────────────────────────────────────────────

  /** Initial checked state. Default `false`. */
  checked?: boolean;

  /** Called whenever the checked state changes. */
  onChange?: (event: UiCheckboxChangeEvent) => void;

  /** Initial disabled state. Default `false`. */
  disabled?: boolean;

  /** Tab order index for keyboard navigation. Default `0`. */
  tabIndex?: number;
}

/**
 * Result returned by {@link createUiCheckbox}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the checkbox
 * and its check-mark child entity, and to clear all owned event listeners.
 */
export interface CreateUiCheckboxResult extends UiWidgetHandle<
  { check: number },
  { onChange: ParameterizedForgeEvent<UiCheckboxChangeEvent> }
> {
  /** The root (box) entity id. */
  entity: number;

  /** The check mark child entity id. Alias for `parts.check`. */
  checkEntity: number;

  /**
   * The element state component. Provides access to all events and current
   * state flags (hover, pressed, focused, disabled).
   */
  state: UiStateEcsComponent;

  /** The checkbox data component. Provides `checked` and `onChange`. */
  checkbox: UiCheckboxEcsComponent;
}

/**
 * Assembles a checkbox widget: a box panel with an inner check-mark panel.
 *
 * Clicking the box (pointer or `ui.activate` keyboard action) toggles
 * `UiCheckboxEcsComponent.checked` and fires `onChange`. The check mark is
 * shown (opacity 1) when checked and hidden (opacity 0) when unchecked.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, and behaviour options.
 * @returns Entity ids and handles for the checkbox.
 */
export function createUiCheckbox(
  world: EcsWorld,
  options: CreateUiCheckboxOptions,
): CreateUiCheckboxResult {
  const {
    renderable,
    checkRenderable,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    pivot = new Vector2(0.5, 0.5),
    rotation = 0,
    scale = new Vector2(1, 1),
    parent,
    tintColor = defaultUiStyleOptions.tintColor,
    borderColor = defaultUiStyleOptions.borderColor,
    borderWidth = defaultUiStyleOptions.borderWidth,
    cornerRadius = defaultUiStyleOptions.cornerRadius,
    opacity = defaultUiStyleOptions.opacity,
    zIndex = defaultUiStyleOptions.zIndex,
    stateStyles = {},
    checkColor = Color.black,
    checkInset = 4,
    checked = false,
    onChange,
    disabled = false,
    tabIndex = 0,
  } = options;

  // ── Root (box) entity ──────────────────────────────────────────────────

  const entity = world.createEntity();

  const transform = world.addComponent(entity, uiTransformId, {
    anchorMin: anchorMin.clone(),
    anchorMax: anchorMax.clone(),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: pivot.clone(),
    rotation,
    scale: scale.clone(),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  if (options.rect) {
    setUiRect(transform, options.rect);
  } else if (options.offsetMin && options.offsetMax) {
    transform.offsetMin = options.offsetMin.clone();
    transform.offsetMax = options.offsetMax.clone();
  }

  const renderableComp = world.addComponent(entity, uiRenderableId, {
    renderable,
    enabled: true,
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
    zIndex,
  });

  world.addComponent(entity, uiInteractableId, {
    enabled: !disabled,
    blocksPointer: true,
  });

  const state = world.addComponent(entity, uiStateId, {
    ...createUiState(),
    disabled,
  });

  world.addComponent(entity, uiFocusableId, { tabIndex, focusable: true });

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  // ── Checkbox component ─────────────────────────────────────────────────

  const checkbox = world.addComponent(
    entity,
    uiCheckboxId,
    createUiCheckboxState(checked),
  );

  if (onChange) {
    checkbox.onChange.registerListener(onChange);
  }

  // ── Check mark entity ──────────────────────────────────────────────────
  // Inset child panel — opacity reflects checked state.

  const checkEntity = world.createEntity();

  world.addComponent(checkEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(checkInset, checkInset),
    offsetMax: new Vector2(-checkInset, -checkInset),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  const checkRenderableComp = world.addComponent(checkEntity, uiRenderableId, {
    renderable: checkRenderable,
    enabled: true,
    tintColor: checkColor,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius,
    opacity: checked ? 1 : 0,
    zIndex: zIndex + 1,
  });

  world.addComponent(checkEntity, parentId, { parent: entity });

  // ── Toggle logic ───────────────────────────────────────────────────────

  const applyChecked = (): void => {
    checkRenderableComp.opacity = checkbox.checked ? 1 : 0;
  };

  state.onClick.registerListener(() => {
    if (state.disabled) {
      return;
    }

    checkbox.checked = !checkbox.checked;
    applyChecked();
    checkbox.onChange.raise({ entity, checked: checkbox.checked });
  });

  // ── State style wiring ─────────────────────────────────────────────────

  const base: UiStyleOverride = {
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
  };

  const refresh = (): void => {
    applyUiStateStyle(renderableComp, state, base, stateStyles);
  };

  state.onHoverEnter.registerListener(refresh);
  state.onHoverExit.registerListener(refresh);
  state.onPressStart.registerListener(refresh);
  state.onPressEnd.registerListener(refresh);
  state.onFocus.registerListener(refresh);
  state.onBlur.registerListener(refresh);
  state.onDisabledChange.registerListener(refresh);

  return {
    entity,
    checkEntity,
    state,
    checkbox,
    parts: { check: checkEntity },
    events: { onChange: checkbox.onChange },
    destroy: (): void => {
      state.onHoverEnter.clear();
      state.onHoverExit.clear();
      state.onPressStart.clear();
      state.onPressEnd.clear();
      state.onClick.clear();
      state.onFocus.clear();
      state.onBlur.clear();
      state.onDisabledChange.clear();
      checkbox.onChange.clear();
      destroyUiSubtree(world, entity);
    },
  };
}
