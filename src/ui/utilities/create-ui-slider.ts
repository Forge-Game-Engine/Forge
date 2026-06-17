import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
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
  UiSliderChangeEvent,
  UiSliderEcsComponent,
  uiSliderId,
} from '../components/ui-slider-component.js';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiSlider}.
 */
export interface CreateUiSliderOptions {
  /**
   * Shared renderable for the track (background) panel.
   * Use {@link createUiRenderable} and share across sliders for batching.
   */
  renderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the fill panel (portion representing the current value).
   * May be the same instance as `renderable`.
   */
  fillRenderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the knob (draggable handle) panel.
   * May be the same instance as `renderable`.
   */
  knobRenderable: Renderable<UiInstanceComponents>;

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Position and size of the track relative to the anchor point. */
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

  // ── Track style ───────────────────────────────────────────────────────────

  /** Track background colour. Defaults to `Color.white`. */
  tintColor?: Color;

  /** Track border colour. Defaults to `Color.transparent`. */
  borderColor?: Color;

  /** Track border width in CSS pixels. Default `0`. */
  borderWidth?: number;

  /** Track corner radius in CSS pixels. Default `0`. */
  cornerRadius?: number;

  /** Track opacity multiplier (0–1). Default `1`. */
  opacity?: number;

  /** Draw order within the canvas. Default `0`. */
  zIndex?: number;

  // ── Fill style ────────────────────────────────────────────────────────────

  /** Fill colour. Defaults to `Color.black`. */
  fillColor?: Color;

  /** Fill corner radius in CSS pixels. Default `0`. */
  fillCornerRadius?: number;

  // ── Knob style ────────────────────────────────────────────────────────────

  /** Knob background colour. Defaults to `Color.white`. */
  knobColor?: Color;

  /** Knob border colour. Defaults to `Color.transparent`. */
  knobBorderColor?: Color;

  /** Knob border width in CSS pixels. Default `0`. */
  knobBorderWidth?: number;

  /** Knob corner radius in CSS pixels. Default `0`. */
  knobCornerRadius?: number;

  /**
   * Knob width in CSS pixels. Required — used to centre the knob on the
   * normalised track position.
   */
  knobWidth: number;

  /**
   * Knob height in CSS pixels. Required — used to size the knob perpendicular
   * to the track axis.
   */
  knobHeight: number;

  /** Per-state knob style overrides (hover, pressed, focused, disabled). */
  knobStateStyles?: UiStateStyleConfig;

  // ── Slider behaviour ──────────────────────────────────────────────────────

  /** Current value. Clamped to `[min, max]`. Default `0`. */
  value?: number;

  /** Minimum value (inclusive). Default `0`. */
  min?: number;

  /** Maximum value (inclusive). Default `1`. */
  max?: number;

  /**
   * Snap interval. Value is snapped to the nearest multiple of `step`
   * relative to `min`. `undefined` means continuous. Default `undefined`.
   */
  step?: number;

  /** Slider orientation. Default `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical';

  /** Called every time the value changes during interaction. */
  onChange?: (event: UiSliderChangeEvent) => void;

  /** Called when an interaction begins. */
  onChangeStart?: (event: UiSliderChangeEvent) => void;

  /** Called when an interaction ends. */
  onChangeEnd?: (event: UiSliderChangeEvent) => void;

  /** Tab order index for keyboard navigation. Default `0`. */
  tabIndex?: number;

  /** Initial disabled state. Default `false`. */
  disabled?: boolean;
}

/**
 * Result returned by {@link createUiSlider}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the slider and
 * all child entities (fill and knob), and to clear all owned event listeners.
 */
export interface CreateUiSliderResult extends UiWidgetHandle<
  { fill: number; knob: number },
  {
    onChange: ParameterizedForgeEvent<UiSliderChangeEvent>;
    onChangeStart: ParameterizedForgeEvent<UiSliderChangeEvent>;
    onChangeEnd: ParameterizedForgeEvent<UiSliderChangeEvent>;
  }
> {
  /** The root (track) entity id. */
  entity: number;

  /** The fill child entity id. Alias for `parts.fill`. */
  fillEntity: number;

  /** The knob child entity id. Alias for `parts.knob`. */
  knobEntity: number;

  /**
   * The slider data component. Provides `value`, `min`, `max`, `step`,
   * `orientation`, and the change events.
   */
  slider: UiSliderEcsComponent;

  /** The knob's state component for focus/hover/press events. */
  knobState: UiStateEcsComponent;
}

/**
 * Assembles a slider widget: track panel, fill panel, and knob panel.
 *
 * The fill stretches from the track's left (or top for vertical) edge to
 * the current normalised value position. The knob is centred at that position.
 * Both are repositioned each frame by {@link createUiSliderEcsSystem} based on
 * `UiSliderEcsComponent.value`.
 *
 * Add {@link createUiSliderEcsSystem} to the world (after the layout system)
 * to enable drag, track-click, and keyboard interactions.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, and behaviour options.
 * @returns Entity ids, the slider component, and the knob's state component.
 */
export function createUiSlider(
  world: EcsWorld,
  options: CreateUiSliderOptions,
): CreateUiSliderResult {
  const {
    renderable,
    fillRenderable,
    knobRenderable,
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
    fillColor = Color.black,
    fillCornerRadius = 0,
    knobColor = Color.white,
    knobBorderColor = defaultUiStyleOptions.borderColor,
    knobBorderWidth = 0,
    knobCornerRadius = 0,
    knobWidth,
    knobHeight,
    knobStateStyles = {},
    value: initialValue = 0,
    min = 0,
    max = 1,
    step,
    orientation = 'horizontal',
    onChange,
    onChangeStart,
    onChangeEnd,
    tabIndex = 0,
    disabled = false,
  } = options;

  const clampedValue = Math.max(min, Math.min(max, initialValue));
  const normalizedValue = max > min ? (clampedValue - min) / (max - min) : 0;

  // ── Root (track) entity ────────────────────────────────────────────────

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

  world.addComponent(entity, uiRenderableId, {
    renderable,
    enabled: true,
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
    zIndex,
  });

  // Track is interactable for track-click (value jump).
  world.addComponent(entity, uiInteractableId, {
    enabled: !disabled,
    blocksPointer: true,
  });

  world.addComponent(entity, uiStateId, {
    ...createUiState(),
    disabled,
  });

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  // ── Fill entity ────────────────────────────────────────────────────────
  // Stretch anchor along the primary axis; current value controls the max.

  const fillEntity = world.createEntity();

  const fillAnchorMax =
    orientation === 'horizontal'
      ? new Vector2(normalizedValue, 1)
      : new Vector2(1, normalizedValue);

  world.addComponent(fillEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: fillAnchorMax,
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  world.addComponent(fillEntity, uiRenderableId, {
    renderable: fillRenderable,
    enabled: true,
    tintColor: fillColor,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: fillCornerRadius,
    opacity,
    zIndex: zIndex + 1,
  });

  world.addComponent(fillEntity, parentId, { parent: entity });

  // ── Knob entity ────────────────────────────────────────────────────────
  // Point anchor at the normalised value position along the primary axis.

  const knobEntity = world.createEntity();

  const knobAnchorX = orientation === 'horizontal' ? normalizedValue : 0.5;
  const knobAnchorY = orientation === 'vertical' ? normalizedValue : 0.5;

  const knobAnchor = new Vector2(knobAnchorX, knobAnchorY);

  world.addComponent(knobEntity, uiTransformId, {
    anchorMin: knobAnchor.clone(),
    anchorMax: knobAnchor.clone(),
    offsetMin: new Vector2(-knobWidth / 2, -knobHeight / 2),
    offsetMax: new Vector2(knobWidth / 2, knobHeight / 2),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(
      new Vector2(0, 0),
      new Vector2(knobWidth, knobHeight),
    ),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  const knobRenderableComp = world.addComponent(knobEntity, uiRenderableId, {
    renderable: knobRenderable,
    enabled: true,
    tintColor: knobColor,
    borderColor: knobBorderColor,
    borderWidth: knobBorderWidth,
    cornerRadius: knobCornerRadius,
    opacity,
    zIndex: zIndex + 2,
  });

  world.addComponent(knobEntity, uiInteractableId, {
    enabled: !disabled,
    blocksPointer: true,
  });

  const knobState = world.addComponent(knobEntity, uiStateId, {
    ...createUiState(),
    disabled,
  });

  world.addComponent(knobEntity, uiFocusableId, { tabIndex, focusable: true });

  world.addComponent(knobEntity, parentId, { parent: entity });

  // ── Knob state style wiring ────────────────────────────────────────────

  const knobBase: UiStyleOverride = {
    tintColor: knobColor,
    borderColor: knobBorderColor,
    borderWidth: knobBorderWidth,
    cornerRadius: knobCornerRadius,
    opacity,
  };

  const refreshKnob = (): void => {
    applyUiStateStyle(knobRenderableComp, knobState, knobBase, knobStateStyles);
  };

  knobState.onHoverEnter.registerListener(refreshKnob);
  knobState.onHoverExit.registerListener(refreshKnob);
  knobState.onPressStart.registerListener(refreshKnob);
  knobState.onPressEnd.registerListener(refreshKnob);
  knobState.onFocus.registerListener(refreshKnob);
  knobState.onBlur.registerListener(refreshKnob);
  knobState.onDisabledChange.registerListener(refreshKnob);

  // ── Slider component ───────────────────────────────────────────────────

  const slider = world.addComponent(entity, uiSliderId, {
    value: clampedValue,
    min,
    max,
    step,
    orientation,
    onChange: new ParameterizedForgeEvent<UiSliderChangeEvent>(
      'ui.sliderChange',
    ),
    onChangeStart: new ParameterizedForgeEvent<UiSliderChangeEvent>(
      'ui.sliderChangeStart',
    ),
    onChangeEnd: new ParameterizedForgeEvent<UiSliderChangeEvent>(
      'ui.sliderChangeEnd',
    ),
    knobEntity,
    fillEntity,
    isDragging: false,
  });

  if (onChange) {
    slider.onChange.registerListener(onChange);
  }

  if (onChangeStart) {
    slider.onChangeStart.registerListener(onChangeStart);
  }

  if (onChangeEnd) {
    slider.onChangeEnd.registerListener(onChangeEnd);
  }

  return {
    entity,
    fillEntity,
    knobEntity,
    slider,
    knobState,
    parts: { fill: fillEntity, knob: knobEntity },
    events: {
      onChange: slider.onChange,
      onChangeStart: slider.onChangeStart,
      onChangeEnd: slider.onChangeEnd,
    },
    destroy: (): void => {
      knobState.onHoverEnter.clear();
      knobState.onHoverExit.clear();
      knobState.onPressStart.clear();
      knobState.onPressEnd.clear();
      knobState.onClick.clear();
      knobState.onFocus.clear();
      knobState.onBlur.clear();
      knobState.onDisabledChange.clear();
      slider.onChange.clear();
      slider.onChangeStart.clear();
      slider.onChangeEnd.clear();
      destroyUiSubtree(world, entity);
    },
  };
}
