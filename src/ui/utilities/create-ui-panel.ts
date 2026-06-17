import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { uiClipId } from '../components/ui-clip-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import {
  defaultUiStyleOptions,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import { createUiState, uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  applyUiStateStyle,
  UiStateStyleConfig,
  UiStyleOverride,
} from './apply-ui-state-style.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiPanel}.
 */
export interface CreateUiPanelOptions {
  /**
   * Shared renderable built with {@link createUiRenderable}.
   * All panels sharing the same renderable instance are batched together.
   */
  renderable: Renderable<UiInstanceComponents>;

  // ── Layout ──────────────────────────────────────────────────────────────

  /**
   * Position and size relative to the anchor point (point-anchor mode).
   * Mutually exclusive with providing both `offsetMin` and `offsetMax`.
   */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /**
   * Pixel inset from the anchor-min edge (stretch-anchor mode).
   * Used when `anchorMin !== anchorMax` and `rect` is not set.
   */
  offsetMin?: Vector2;

  /**
   * Pixel inset from the anchor-max edge (stretch-anchor mode).
   * Used when `anchorMin !== anchorMax` and `rect` is not set.
   */
  offsetMax?: Vector2;

  /** Normalised (0–1) pivot point. Defaults to `(0, 0)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Defaults to `(1, 1)`. */
  scale?: Vector2;

  /** Parent entity id. When provided, this panel is a child of that entity. */
  parent?: number;

  // ── Style ────────────────────────────────────────────────────────────────

  /** Fill colour. Defaults to `Color.white`. */
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

  // ── State styles ─────────────────────────────────────────────────────────

  /**
   * Per-state visual overrides applied by {@link applyUiStateStyle}.
   * Only used when `interactable` or `focusable` is `true`.
   */
  stateStyles?: UiStateStyleConfig;

  // ── Features ─────────────────────────────────────────────────────────────

  /**
   * When `true`, attaches a {@link UiClipEcsComponent} so descendant elements
   * are clipped to this panel's rect — the basis for scroll groups.
   * Default `false`.
   */
  clip?: boolean;

  /**
   * When `true`, attaches a {@link UiInteractableEcsComponent} so the panel
   * participates in pointer hit-testing. Default `false`.
   */
  interactable?: boolean;

  /**
   * When `true`, attaches a {@link UiFocusableEcsComponent} so the panel
   * can receive keyboard focus via tab navigation. Implies `interactable`.
   * Default `false`.
   */
  focusable?: boolean;

  /**
   * Tab order index used by the keyboard nav system.
   * Lower values come first. Default `0`.
   */
  tabIndex?: number;

  /**
   * Initial disabled state. Only relevant when `interactable` is `true`.
   * Default `false`.
   */
  disabled?: boolean;
}

/**
 * Result returned by {@link createUiPanel}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the panel and
 * clean up any owned event listeners.
 */
export interface CreateUiPanelResult extends UiWidgetHandle<
  Record<string, never>,
  Record<string, never>
> {
  /** The root entity id of the panel. */
  entity: number;
}

/**
 * Assembles a UI panel entity and returns its id.
 *
 * A panel is the base visual container: an entity with a
 * {@link UiTransformEcsComponent} and a {@link UiRenderableEcsComponent} using
 * the default shader. Optional features — clipping, interactability, keyboard
 * focus, and per-state style transitions — are added by setting the
 * corresponding options.
 *
 * All panels that share the same `renderable` instance are batched into one
 * instanced draw call.
 *
 * @param world - The ECS world to create the entity in.
 * @param options - Layout, style, and feature options.
 * @returns An object containing the panel entity id.
 */
export function createUiPanel(
  world: EcsWorld,
  options: CreateUiPanelOptions,
): CreateUiPanelResult {
  const {
    renderable,
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
    clip = false,
    interactable = false,
    focusable = false,
    tabIndex = 0,
    disabled = false,
  } = options;

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

  if (clip) {
    world.addComponent(entity, uiClipId, { enabled: true });
  }

  const needsInteraction = interactable || focusable;

  if (needsInteraction) {
    world.addComponent(entity, uiInteractableId, {
      enabled: !disabled,
      blocksPointer: true,
    });

    const state = world.addComponent(entity, uiStateId, {
      ...createUiState(),
      disabled,
    });

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
  }

  if (focusable) {
    world.addComponent(entity, uiFocusableId, { tabIndex, focusable: true });
  }

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  return {
    entity,
    parts: {},
    events: {},
    destroy: () => {
      if (needsInteraction) {
        const stateComp = world.getComponent(entity, uiStateId);

        if (stateComp) {
          stateComp.onHoverEnter.clear();
          stateComp.onHoverExit.clear();
          stateComp.onPressStart.clear();
          stateComp.onPressEnd.clear();
          stateComp.onClick.clear();
          stateComp.onFocus.clear();
          stateComp.onBlur.clear();
          stateComp.onDisabledChange.clear();
        }
      }

      destroyUiSubtree(world, entity);
    },
  };
}
