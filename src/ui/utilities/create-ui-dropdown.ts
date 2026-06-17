import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent } from '../../events/forge-event.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { RenderContext } from '../../rendering/render-context.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import {
  defaultUiStyleOptions,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import { createUiState, uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import type { FontAsset } from '../text/types/font-asset.js';
import {
  UiDropdownChangeEvent,
  UiDropdownEcsComponent,
  uiDropdownId,
} from '../components/ui-dropdown-component.js';
import { createUiButton } from './create-ui-button.js';
import { createUiScrollGroup } from './create-ui-scroll-group.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiDropdown}.
 */
export interface CreateUiDropdownOptions {
  /**
   * Shared renderable for the trigger button background and popup panel
   * background.
   */
  renderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the option buttons inside the popup.
   */
  optionRenderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the scroll group inside the popup (typically
   * transparent or same as `renderable`).
   */
  scrollRenderable: Renderable<UiInstanceComponents>;

  /** WebGL render context, required for button label text entities. */
  renderContext: RenderContext;

  /** Font asset used for button labels and option text. */
  font: FontAsset;

  // ── Layout ──────────────────────────────────────────────────────────────

  /**
   * Position and size of the trigger button relative to the anchor point.
   * Mutually exclusive with `offsetMin`/`offsetMax`.
   */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /** Direct offsets for stretch-anchor mode. Used when `rect` is absent. */
  offsetMin?: Vector2;

  /** Direct offsets for stretch-anchor mode. Used when `rect` is absent. */
  offsetMax?: Vector2;

  /** Parent entity id for the trigger button. */
  parent?: number;

  /** Entity id of the canvas root. Popup is parented here to avoid clip inheritance. */
  canvasEntity: number;

  // ── Style ────────────────────────────────────────────────────────────────

  /** Background colour for the trigger button. Defaults to `Color.white`. */
  tintColor?: Color;

  /** Border colour. Defaults to `Color.transparent`. */
  borderColor?: Color;

  /** Border width in CSS pixels. Default `0`. */
  borderWidth?: number;

  /** Corner radius in CSS pixels. Default `0`. */
  cornerRadius?: number;

  /** Opacity. Default `1`. */
  opacity?: number;

  /** Draw order for the trigger button. Default `0`. */
  zIndex?: number;

  /** Draw order for the popup panel (should be higher than all other UI). Default `9000`. */
  popupZIndex?: number;

  // ── Popup dimensions ─────────────────────────────────────────────────────

  /**
   * Height of the visible popup in pixels. A scroll group is created when
   * the total option height exceeds this value. Default `200`.
   */
  popupHeight?: number;

  /** Height of each option button row in pixels. Default `32`. */
  optionHeight?: number;

  /** Label font size in pixels. Default `16`. */
  fontSize?: number;

  // ── Options ───────────────────────────────────────────────────────────────

  /** The selectable option labels. */
  options: string[];

  /** Index of the initially selected option. Default `0`. */
  selectedIndex?: number;

  /** Called when the user selects a different option. */
  onChange?: (event: UiDropdownChangeEvent) => void;

  /** Called when the popup opens. */
  onOpen?: () => void;

  /** Called when the popup closes. */
  onClose?: () => void;

  /** Tab order index for the trigger button. Default `0`. */
  tabIndex?: number;
}

/**
 * Result returned by {@link createUiDropdown}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the entire
 * dropdown widget and its popup entity tree.
 */
export interface CreateUiDropdownResult extends UiWidgetHandle<
  { trigger: number; popup: number; optionEntities: number[] },
  {
    onChange: ParameterizedForgeEvent<UiDropdownChangeEvent>;
    onOpen: ForgeEvent;
    onClose: ForgeEvent;
  }
> {
  /** The root entity id (owns the `UiDropdownEcsComponent`). */
  entity: number;

  /** The trigger button entity id. Alias for `parts.trigger`. */
  triggerEntity: number;

  /** The popup panel entity id. Alias for `parts.popup`. */
  popupEntity: number;

  /** The `UiDropdownEcsComponent` attached to the root entity. */
  dropdown: UiDropdownEcsComponent;
}

/**
 * Assembles a dropdown / select widget.
 *
 * The widget consists of:
 * - A **trigger button** showing the currently selected option label. Clicking
 *   it toggles `UiDropdownEcsComponent.isOpen`.
 * - A **popup panel** eagerly created and parented to the canvas root entity so
 *   it is never clipped by ancestor `UiClipEcsComponent` regions. The popup
 *   contains a scroll group with one option button per option. It is rendered
 *   invisible (`enabled = false`) when closed.
 *
 * Add {@link createUiDropdownEcsSystem} to the ECS world to drive open/close
 * transitions, focus-trapping, click-away detection, and keyboard Escape.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, and options configuration.
 * @returns Entity ids, the dropdown component, and runtime handles.
 */
export function createUiDropdown(
  world: EcsWorld,
  options: CreateUiDropdownOptions,
): CreateUiDropdownResult {
  const {
    renderable,
    optionRenderable,
    scrollRenderable,
    renderContext,
    font,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    parent,
    canvasEntity,
    tintColor = defaultUiStyleOptions.tintColor,
    borderColor = defaultUiStyleOptions.borderColor,
    borderWidth = defaultUiStyleOptions.borderWidth,
    cornerRadius = defaultUiStyleOptions.cornerRadius,
    opacity = defaultUiStyleOptions.opacity,
    zIndex = defaultUiStyleOptions.zIndex,
    popupZIndex = 9000,
    popupHeight = 200,
    optionHeight = 32,
    fontSize = 16,
    options: optionLabels,
    selectedIndex: initialSelectedIndex = 0,
    onChange,
    onOpen,
    onClose,
    tabIndex = 0,
  } = options;

  // ── Root entity ────────────────────────────────────────────────────────
  // The root entity carries the UiDropdownEcsComponent and also acts as
  // the container for the trigger button's layout context. It shares the
  // transform with the trigger for simplicity.

  const entity = world.createEntity();

  const rootTransform = world.addComponent(entity, uiTransformId, {
    anchorMin: anchorMin.clone(),
    anchorMax: anchorMax.clone(),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  if (options.rect) {
    setUiRect(rootTransform, options.rect);
  } else if (options.offsetMin && options.offsetMax) {
    rootTransform.offsetMin = options.offsetMin.clone();
    rootTransform.offsetMax = options.offsetMax.clone();
  }

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  // ── Trigger button ─────────────────────────────────────────────────────
  // Stretches to fill the root entity.

  const triggerButton = createUiButton(world, {
    renderable,
    renderContext,
    font,
    label: optionLabels[initialSelectedIndex] ?? '',
    fontSize,
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
    zIndex,
    tabIndex,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    parent: entity,
  });

  const triggerEntity = triggerButton.entity;

  // ── Popup panel ────────────────────────────────────────────────────────
  // Parented to the canvas entity so it is not clipped by ancestor panels.
  // Positioned absolutely. The dropdown system repositions it each time it
  // opens based on the trigger's resolved rect.

  const totalContentHeight = optionLabels.length * optionHeight;
  const contentSize = new Vector2(0, totalContentHeight);

  const popupEntity = world.createEntity();

  const popupTransform = world.addComponent(popupEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(100, popupHeight),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  // Initial popup position is off-screen; the system places it correctly
  // below the trigger on first open.
  popupTransform.offsetMin.x = -9999;
  popupTransform.offsetMin.y = -9999;

  world.addComponent(popupEntity, uiRenderableId, {
    renderable,
    enabled: false,
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
    zIndex: popupZIndex,
  });

  world.addComponent(popupEntity, uiInteractableId, {
    enabled: false,
    blocksPointer: true,
  });

  world.addComponent(popupEntity, uiStateId, {
    ...createUiState(),
    disabled: false,
  });

  world.addComponent(popupEntity, parentId, { parent: canvasEntity });

  // ── Scroll group inside popup ──────────────────────────────────────────

  const scrollGroup = createUiScrollGroup(world, {
    renderable: scrollRenderable,
    contentRenderable: scrollRenderable,
    contentSize,
    orientation: 'vertical',
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    tintColor: Color.transparent,
    parent: popupEntity,
    zIndex: popupZIndex,
  });

  // ── Option buttons ─────────────────────────────────────────────────────

  const onChangeEvent = new ParameterizedForgeEvent<UiDropdownChangeEvent>(
    'ui.dropdown.change',
  );
  const onOpenEvent = new ForgeEvent('ui.dropdown.open');
  const onCloseEvent = new ForgeEvent('ui.dropdown.close');

  if (onChange) {
    onChangeEvent.registerListener(onChange);
  }

  if (onOpen) {
    onOpenEvent.registerListener(onOpen);
  }

  if (onClose) {
    onCloseEvent.registerListener(onClose);
  }

  // ── UiDropdownEcsComponent ─────────────────────────────────────────────
  // Created before option buttons so onClick handlers can close over it.

  const dropdownComp = world.addComponent(entity, uiDropdownId, {
    options: [...optionLabels],
    selectedIndex: initialSelectedIndex,
    isOpen: false,
    onChange: onChangeEvent,
    onOpen: onOpenEvent,
    onClose: onCloseEvent,
    triggerEntity,
    popupEntity,
    optionEntities: [],
    canvasEntity,
  });

  // ── Option buttons ─────────────────────────────────────────────────────

  for (let i = 0; i < optionLabels.length; i++) {
    const label = optionLabels[i] ?? '';
    const optionY = i * optionHeight;
    const optionIndex = i;

    const optionButton = createUiButton(world, {
      renderable: optionRenderable,
      renderContext,
      font,
      label,
      fontSize,
      tintColor: Color.white,
      zIndex: popupZIndex + 1,
      tabIndex: optionIndex,
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(1, 0),
      offsetMin: new Vector2(0, optionY),
      offsetMax: new Vector2(0, optionY + optionHeight),
      parent: scrollGroup.contentEntity,
      onClick: () => {
        dropdownComp.selectedIndex = optionIndex;
        dropdownComp.isOpen = false;
        triggerButton.setLabel(optionLabels[optionIndex] ?? '');
        onChangeEvent.raise({
          entity,
          selectedIndex: optionIndex,
          value: optionLabels[optionIndex] ?? '',
        });
      },
    });

    // Option buttons start with focusable=false; the dropdown system enables
    // them when the popup opens and disables them on close.
    const focusable = world.getComponent(optionButton.entity, uiFocusableId);

    if (focusable) {
      focusable.focusable = false;
    }

    // Renderable is disabled by default (popup is closed).
    const optRenderable = world.getComponent(
      optionButton.entity,
      uiRenderableId,
    );

    if (optRenderable) {
      optRenderable.enabled = false;
    }

    dropdownComp.optionEntities.push(optionButton.entity);
  }

  // ── Trigger click wires open/close ─────────────────────────────────────

  triggerButton.state.onClick.registerListener(() => {
    dropdownComp.isOpen = !dropdownComp.isOpen;
  });

  return {
    entity,
    triggerEntity,
    popupEntity,
    dropdown: dropdownComp,
    parts: {
      trigger: triggerEntity,
      popup: popupEntity,
      optionEntities: dropdownComp.optionEntities,
    },
    events: {
      onChange: onChangeEvent,
      onOpen: onOpenEvent,
      onClose: onCloseEvent,
    },
    destroy: (): void => {
      onChangeEvent.clear();
      onOpenEvent.clear();
      onCloseEvent.clear();
      destroyUiSubtree(world, entity);
      destroyUiSubtree(world, popupEntity);
    },
  };
}
