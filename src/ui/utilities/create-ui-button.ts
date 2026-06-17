import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { RenderContext } from '../../rendering/render-context.js';
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
import { createUiText } from '../text/create-ui-text.js';
import { uiTextId } from '../text/ui-text-ecs-component.js';
import type { FontAsset } from '../text/types/font-asset.js';
import type { TextAlign, TextVerticalAlign } from '../text/shape-text.js';
import { UiInteractionEvent } from '../types/index.js';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiButton}.
 */
export interface CreateUiButtonOptions {
  /**
   * Shared renderable built with {@link createUiRenderable} for the button
   * background. All buttons sharing the same renderable are batched together.
   */
  renderable: Renderable<UiInstanceComponents>;

  /** WebGL render context, required to create the label text entity. */
  renderContext: RenderContext;

  /** Font asset used for the button label. */
  font: FontAsset;

  // ── Layout ────────────────────────────────────────────────────────────────

  /**
   * Position and size relative to the anchor point (point-anchor mode).
   * Mutually exclusive with providing both `offsetMin` and `offsetMax`.
   */
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

  // ── Background style ──────────────────────────────────────────────────────

  /** Background fill colour. Defaults to `Color.white`. */
  tintColor?: Color;

  /** Border colour. Defaults to `Color.transparent`. */
  borderColor?: Color;

  /** Border width in CSS pixels. Default `0`. */
  borderWidth?: number;

  /** Corner radius in CSS pixels. Default `0`. */
  cornerRadius?: number;

  /** Opacity multiplier (0–1). Default `1`. */
  opacity?: number;

  /** Draw order within the canvas. Default `0`. */
  zIndex?: number;

  /** Per-state background style overrides (hover, pressed, focused, disabled). */
  stateStyles?: UiStateStyleConfig;

  // ── Label ─────────────────────────────────────────────────────────────────

  /** Text string displayed on the button. Default `''`. */
  label?: string;

  /** Label font size in pixels. Default `16`. */
  fontSize?: number;

  /** Label text colour. Defaults to `Color.black`. */
  labelColor?: Color;

  /** Horizontal text alignment. Default `'center'`. */
  labelAlign?: TextAlign;

  /** Vertical text alignment. Default `'middle'`. */
  labelVerticalAlign?: TextVerticalAlign;

  /**
   * Inner padding in pixels applied to the label rect: `[top, right, bottom, left]`.
   * The label stretches to fill the button minus these insets. Default all zeros.
   */
  labelPadding?: [number, number, number, number];

  // ── Behaviour ─────────────────────────────────────────────────────────────

  /** Called when the button is clicked (pointer or keyboard). */
  onClick?: (event: UiInteractionEvent) => void;

  /** Initial disabled state. Default `false`. */
  disabled?: boolean;

  /** Tab order index for keyboard navigation. Default `0`. */
  tabIndex?: number;

  /**
   * When `true`, the button latches its pressed visual state on click and
   * releases it on the next click (toggle button mode). Default `false`.
   */
  toggle?: boolean;
}

/**
 * Result returned by {@link createUiButton}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the button and
 * its label entity, and to clear all owned event listeners.
 */
export interface CreateUiButtonResult extends UiWidgetHandle<
  { label: number },
  { onClick: ParameterizedForgeEvent<UiInteractionEvent> }
> {
  /** The root (background panel) entity id. */
  entity: number;

  /** The child text label entity id. Alias for `parts.label`. */
  labelEntity: number;

  /**
   * The element state component. Provides access to all events
   * (`onClick`, `onHoverEnter`, `onFocus`, etc.) and current state flags.
   */
  state: UiStateEcsComponent;

  /**
   * Updates the label text at runtime. Marks the text component as dirty so
   * the text system reshapes the string on the next frame.
   *
   * @param text - The new label string.
   */
  setLabel: (text: string) => void;

  /**
   * When `toggle` mode is enabled, returns `true` while the button is in its
   * latched state. Always returns `false` for non-toggle buttons.
   */
  isToggled: () => boolean;
}

/**
 * Assembles a button widget: a background panel with a centred text label.
 *
 * Interaction is wired through {@link UiStateEcsComponent}: `onClick` fires on
 * both pointer click and `ui.activate` (keyboard). Visual states (hover,
 * pressed, focused, disabled) are applied immediately via
 * {@link applyUiStateStyle}; Epic 8 will animate these transitions. Disabled
 * buttons have `blocksPointer = false` so they do not intercept hover.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, label, and behaviour options.
 * @returns Entity ids, the state component, and runtime handles.
 */
export function createUiButton(
  world: EcsWorld,
  options: CreateUiButtonOptions,
): CreateUiButtonResult {
  const {
    renderable,
    renderContext,
    font,
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
    label = '',
    fontSize = 16,
    labelColor = Color.black,
    labelAlign = 'center',
    labelVerticalAlign = 'middle',
    labelPadding = [0, 0, 0, 0],
    onClick,
    disabled = false,
    tabIndex = 0,
    toggle = false,
  } = options;

  // ── Root (background) entity ───────────────────────────────────────────

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
    blocksPointer: !disabled,
  });

  const state = world.addComponent(entity, uiStateId, {
    ...createUiState(),
    disabled,
  });

  world.addComponent(entity, uiFocusableId, { tabIndex, focusable: true });

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  // ── Label entity ────────────────────────────────────────────────────────
  // The label uses a stretch anchor (0,0)→(1,1) so it fills the button.
  // Padding is applied via offsetMin/offsetMax margins.

  const [padTop, padRight, padBottom, padLeft] = labelPadding;

  // createUiText requires a rect; pass a zero-size placeholder and then
  // override the offsets for stretch-anchor padding below.
  const labelEntity = createUiText(world, renderContext, {
    text: label,
    font,
    fontSize,
    color: labelColor,
    align: labelAlign,
    verticalAlign: labelVerticalAlign,
    wrap: 'none',
    overflow: 'visible',
    opacity: 1,
    zIndex: zIndex + 1,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    pivot: new Vector2(0, 0),
    parent: entity,
  });

  const labelTransform = world.getComponent(labelEntity, uiTransformId)!;

  labelTransform.offsetMin.x = padLeft;
  labelTransform.offsetMin.y = padTop;
  labelTransform.offsetMax.x = -padRight;
  labelTransform.offsetMax.y = -padBottom;
  labelTransform.isDirty = true;

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

    const interactable = world.getComponent(entity, uiInteractableId);

    if (interactable) {
      interactable.blocksPointer = !state.disabled;
    }
  };

  state.onHoverEnter.registerListener(refresh);
  state.onHoverExit.registerListener(refresh);
  state.onPressStart.registerListener(refresh);
  state.onPressEnd.registerListener(refresh);
  state.onFocus.registerListener(refresh);
  state.onBlur.registerListener(refresh);
  state.onDisabledChange.registerListener(refresh);

  // ── Toggle mode ────────────────────────────────────────────────────────

  let toggled = false;

  if (toggle) {
    state.onClick.registerListener((event) => {
      toggled = !toggled;
      state.pressed = toggled;
      refresh();
      onClick?.(event);
    });
  } else if (onClick) {
    state.onClick.registerListener(onClick);
  }

  return {
    entity,
    labelEntity,
    state,
    parts: { label: labelEntity },
    events: { onClick: state.onClick },
    destroy: (): void => {
      state.onHoverEnter.clear();
      state.onHoverExit.clear();
      state.onPressStart.clear();
      state.onPressEnd.clear();
      state.onClick.clear();
      state.onFocus.clear();
      state.onBlur.clear();
      state.onDisabledChange.clear();
      destroyUiSubtree(world, entity);
    },
    setLabel: (text: string): void => {
      const textComp = world.getComponent(labelEntity, uiTextId);

      if (textComp) {
        textComp.text = text;
        textComp.dirty = true;
      }
    },
    isToggled: (): boolean => toggled,
  };
}
