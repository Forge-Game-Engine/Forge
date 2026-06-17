import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { RenderContext } from '../../rendering/render-context.js';
import { uiClipId } from '../components/ui-clip-component.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import {
  UiInputChangeEvent,
  UiInputEcsComponent,
  uiInputId,
  UiInputSubmitEvent,
} from '../components/ui-input-component.js';
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
import type { FontAsset } from '../text/types/font-asset.js';
import type { UiTextInputSource } from './create-ui-text-input-source.js';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/** Padding (pixels) between the panel edge and the text / caret. */
const defaultTextPadding = 4;

/**
 * Options for {@link createUiInputBox}.
 */
export interface CreateUiInputBoxOptions {
  /**
   * Shared renderable for the input box background panel.
   * All input boxes sharing the same renderable are batched together.
   */
  renderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the caret panel (thin vertical bar).
   * May be the same instance as `renderable`.
   */
  caretRenderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the selection highlight panel.
   * May be the same instance as `renderable`.
   */
  selectionRenderable: Renderable<UiInstanceComponents>;

  /** WebGL render context for creating the text entity. */
  renderContext: RenderContext;

  /** Font asset for the input text and placeholder. */
  font: FontAsset;

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Position and size relative to the anchor point (point-anchor mode). */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /** Direct offset for stretch-anchor mode. */
  offsetMin?: Vector2;

  /** Direct offset for stretch-anchor mode. */
  offsetMax?: Vector2;

  /** Normalised (0–1) pivot. Defaults to `(0, 0)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Defaults to `(1, 1)`. */
  scale?: Vector2;

  /** Parent entity id. */
  parent?: number;

  // ── Box style ─────────────────────────────────────────────────────────────

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

  // ── Text style ────────────────────────────────────────────────────────────

  /** Text colour. Defaults to `Color.black`. */
  textColor?: Color;

  /** Font size in pixels. Default `16`. */
  fontSize?: number;

  /**
   * Inner padding in pixels: `[top, right, bottom, left]`.
   * Text, caret, and selection are inset by these amounts. Default all `4`.
   */
  textPadding?: [number, number, number, number];

  // ── Caret style ───────────────────────────────────────────────────────────

  /** Caret colour. Defaults to `Color.black`. */
  caretColor?: Color;

  /** Caret width in CSS pixels. Default `2`. */
  caretWidth?: number;

  // ── Selection style ───────────────────────────────────────────────────────

  /** Selection highlight colour. Defaults to a semi-transparent blue. */
  selectionColor?: Color;

  // ── Input behaviour ───────────────────────────────────────────────────────

  /** Initial field value. Default `''`. */
  value?: string;

  /** Placeholder text shown when the field is empty. Default `''`. */
  placeholder?: string;

  /**
   * When `true`, the displayed text is replaced with `•` characters.
   * Default `false`.
   */
  masked?: boolean;

  /** Maximum allowed character count. Default `undefined` (no limit). */
  maxLength?: number;

  /**
   * When `true`, Enter inserts a newline. Default `false` (single-line).
   */
  multiline?: boolean;

  /** Called when the field value changes. */
  onChange?: (event: UiInputChangeEvent) => void;

  /** Called when the user submits the field (Enter in single-line mode). */
  onSubmit?: (event: UiInputSubmitEvent) => void;

  // ── Focus behaviour ───────────────────────────────────────────────────────

  /**
   * A {@link UiTextInputSource} (hidden DOM `<input>`) to focus when this
   * input box gains keyboard focus. Pass the shared instance created by
   * {@link createUiTextInputSource}.
   *
   * Required for character input; omit only for read-only display.
   */
  textInputSource?: UiTextInputSource;

  /** Tab order index. Default `0`. */
  tabIndex?: number;

  /** Initial disabled state. Default `false`. */
  disabled?: boolean;
}

/**
 * Result returned by {@link createUiInputBox}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove all entities
 * and clear event listeners.
 */
export interface CreateUiInputBoxResult extends UiWidgetHandle<
  { text: number; caret: number; selection: number },
  {
    onChange: ParameterizedForgeEvent<UiInputChangeEvent>;
    onSubmit: ParameterizedForgeEvent<UiInputSubmitEvent>;
  }
> {
  /** The root (background panel) entity id. */
  entity: number;

  /** The text label entity id. Alias for `parts.text`. */
  textEntity: number;

  /** The caret entity id. Alias for `parts.caret`. */
  caretEntity: number;

  /** The selection highlight entity id. Alias for `parts.selection`. */
  selectionEntity: number;

  /** The input state component. */
  input: UiInputEcsComponent;

  /** The element state component (hover, press, focus, disabled). */
  state: UiStateEcsComponent;
}

/**
 * Assembles an input box widget: a clipped background panel with a text label,
 * a caret cursor, and a selection highlight child.
 *
 * The panel has `UiClipEcsComponent` so text that exceeds its width is masked.
 * Interaction is wired through {@link UiStateEcsComponent}: clicking focuses
 * the box; focus enables the caret and (if a `textInputSource` was provided)
 * forwards focus to the hidden DOM `<input>` so character input is captured.
 *
 * Add {@link createUiInputEcsSystem} to the world to enable keyboard editing.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, and behaviour options.
 * @returns Entity ids and runtime handles.
 */
export function createUiInputBox(
  world: EcsWorld,
  options: CreateUiInputBoxOptions,
): CreateUiInputBoxResult {
  const {
    renderable,
    caretRenderable,
    selectionRenderable,
    renderContext,
    font,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    pivot = new Vector2(0, 0),
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
    textColor = Color.black,
    fontSize = 16,
    textPadding = [
      defaultTextPadding,
      defaultTextPadding,
      defaultTextPadding,
      defaultTextPadding,
    ],
    caretColor = Color.black,
    caretWidth = 2,
    selectionColor = new Color(0.2, 0.5, 1, 0.3),
    value: initialValue = '',
    placeholder = '',
    masked = false,
    maxLength,
    multiline = false,
    onChange,
    onSubmit,
    textInputSource,
    tabIndex = 0,
    disabled = false,
  } = options;

  const [padTop, padRight, padBottom, padLeft] = textPadding;

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

  world.addComponent(entity, uiClipId, { enabled: true });

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

  // ── State style wiring ─────────────────────────────────────────────────

  const base: UiStyleOverride = {
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
  };

  const refreshStyle = (): void => {
    applyUiStateStyle(renderableComp, state, base, stateStyles);
  };

  state.onHoverEnter.registerListener(refreshStyle);
  state.onHoverExit.registerListener(refreshStyle);
  state.onPressStart.registerListener(refreshStyle);
  state.onPressEnd.registerListener(refreshStyle);
  state.onFocus.registerListener(refreshStyle);
  state.onBlur.registerListener(refreshStyle);
  state.onDisabledChange.registerListener(refreshStyle);

  // ── Selection entity (behind text) ────────────────────────────────────

  const selectionEntity = world.createEntity();

  world.addComponent(selectionEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(padLeft, padTop),
    offsetMax: new Vector2(padLeft, padTop + fontSize),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  world.addComponent(selectionEntity, uiRenderableId, {
    renderable: selectionRenderable,
    enabled: false,
    tintColor: selectionColor,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: 0,
    opacity: 1,
    zIndex: zIndex + 1,
  });

  world.addComponent(selectionEntity, parentId, { parent: entity });

  // ── Text entity ────────────────────────────────────────────────────────

  const displayText = masked
    ? '•'.repeat(initialValue.length)
    : initialValue || placeholder;

  const textEntity = createUiText(world, renderContext, {
    text: displayText,
    font,
    fontSize,
    color: initialValue ? textColor : new Color(0.6, 0.6, 0.6, 1),
    align: 'left',
    verticalAlign: 'middle',
    wrap: 'none',
    overflow: 'visible',
    opacity: 1,
    zIndex: zIndex + 2,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    pivot: new Vector2(0, 0),
    parent: entity,
  });

  const textTransform = world.getComponent(textEntity, uiTransformId)!;
  textTransform.offsetMin.x = padLeft;
  textTransform.offsetMin.y = padTop;
  textTransform.offsetMax.x = -padRight;
  textTransform.offsetMax.y = -padBottom;
  textTransform.isDirty = true;

  // ── Caret entity ───────────────────────────────────────────────────────

  const caretEntity = world.createEntity();

  world.addComponent(caretEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(padLeft, padTop),
    offsetMax: new Vector2(padLeft + caretWidth, padTop + fontSize),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(
      new Vector2(0, 0),
      new Vector2(caretWidth, fontSize),
    ),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  world.addComponent(caretEntity, uiRenderableId, {
    renderable: caretRenderable,
    enabled: false,
    tintColor: caretColor,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: 0,
    opacity: 1,
    zIndex: zIndex + 3,
  });

  world.addComponent(caretEntity, parentId, { parent: entity });

  // ── Input component ────────────────────────────────────────────────────

  const inputComp = world.addComponent(entity, uiInputId, {
    value: initialValue,
    caretIndex: initialValue.length,
    selectionAnchor: null,
    placeholder,
    masked,
    maxLength,
    multiline,
    onChange: new ParameterizedForgeEvent<UiInputChangeEvent>('ui.inputChange'),
    onSubmit: new ParameterizedForgeEvent<UiInputSubmitEvent>('ui.inputSubmit'),
    textEntity,
    caretEntity,
    selectionEntity,
  });

  if (onChange) {
    inputComp.onChange.registerListener(onChange);
  }

  if (onSubmit) {
    inputComp.onSubmit.registerListener(onSubmit);
  }

  // ── Focus / blur wiring ────────────────────────────────────────────────

  state.onFocus.registerListener(() => {
    const caretRendComp = world.getComponent(caretEntity, uiRenderableId);

    if (caretRendComp) {
      caretRendComp.enabled = true;
    }

    textInputSource?.focus(inputComp.value, inputComp.caretIndex);
  });

  state.onBlur.registerListener(() => {
    const caretRendComp = world.getComponent(caretEntity, uiRenderableId);

    if (caretRendComp) {
      caretRendComp.enabled = false;
    }

    const selRendComp = world.getComponent(selectionEntity, uiRenderableId);

    if (selRendComp) {
      selRendComp.enabled = false;
    }

    inputComp.selectionAnchor = null;
    textInputSource?.blur();
  });

  return {
    entity,
    textEntity,
    caretEntity,
    selectionEntity,
    input: inputComp,
    state,
    parts: { text: textEntity, caret: caretEntity, selection: selectionEntity },
    events: { onChange: inputComp.onChange, onSubmit: inputComp.onSubmit },
    destroy: (): void => {
      state.onHoverEnter.clear();
      state.onHoverExit.clear();
      state.onPressStart.clear();
      state.onPressEnd.clear();
      state.onClick.clear();
      state.onFocus.clear();
      state.onBlur.clear();
      state.onDisabledChange.clear();
      inputComp.onChange.clear();
      inputComp.onSubmit.clear();
      destroyUiSubtree(world, entity);
    },
  };
}
