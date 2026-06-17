import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Renderable } from '../../rendering/renderable.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import {
  defaultUiStyleOptions,
  UiRenderableEcsComponent,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import {
  createUiState,
  UiStateEcsComponent,
  uiStateId,
} from '../components/ui-state-component.js';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';
import { Color } from '../../rendering/color.js';
import { setUiRect, UiRect } from './set-ui-rect.js';

/**
 * Visual style options for an element created by {@link createUiElement}.
 * When provided, a {@link UiRenderableEcsComponent} is added to the entity.
 */
export interface UiElementStyleOptions {
  /**
   * Shared renderable built with {@link createUiRenderable} or
   * {@link createCustomUiRenderable}. All entities sharing the same renderable
   * are batched into one instanced draw call.
   */
  renderable: Renderable<UiInstanceComponents>;

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
}

/**
 * Pointer interaction options for an element created by {@link createUiElement}.
 * When provided, {@link UiInteractableEcsComponent} and
 * {@link UiStateEcsComponent} are added to the entity.
 */
export interface UiElementInteractableOptions {
  /** Starts disabled (excluded from hit-testing). Default `false`. */
  disabled?: boolean;

  /**
   * When `true`, hit-testing stops at this element.
   * Default `true`.
   */
  blocksPointer?: boolean;
}

/**
 * Keyboard focus options for an element created by {@link createUiElement}.
 * When provided, a {@link UiFocusableEcsComponent} is added. Also implies
 * {@link UiElementInteractableOptions} — interaction components are added even
 * if `interactable` is not separately specified.
 */
export interface UiElementFocusableOptions {
  /** Tab order position. Lower values come first. Default `0`. */
  tabIndex?: number;
}

/**
 * Options for {@link createUiElement}.
 */
export interface CreateUiElementOptions {
  // ── Parent ───────────────────────────────────────────────────────────────

  /** Parent entity id. When provided, a {@link ParentEcsComponent} is attached. */
  parent?: number;

  // ── Transform ────────────────────────────────────────────────────────────

  /**
   * Position and size in point-anchor mode.
   * Mutually exclusive with providing both `offsetMin` and `offsetMax`.
   */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)`. */
  anchorMax?: Vector2;

  /** Pixel offset from the anchor-min edge (stretch mode). */
  offsetMin?: Vector2;

  /** Pixel offset from the anchor-max edge (stretch mode). */
  offsetMax?: Vector2;

  /** Normalised (0–1) pivot. Defaults to `(0, 0)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Defaults to `(1, 1)`. */
  scale?: Vector2;

  // ── Optional components ───────────────────────────────────────────────────

  /**
   * When provided, a {@link UiRenderableEcsComponent} is attached using these
   * style values.
   */
  style?: UiElementStyleOptions;

  /**
   * When provided, {@link UiInteractableEcsComponent} and
   * {@link UiStateEcsComponent} are attached. Also implied by `focusable`.
   */
  interactable?: UiElementInteractableOptions;

  /**
   * When provided, a {@link UiFocusableEcsComponent} is attached. Adds
   * interaction components automatically if `interactable` is not set.
   */
  focusable?: UiElementFocusableOptions;
}

/**
 * Result returned by {@link createUiElement}.
 */
export interface CreateUiElementResult {
  /** The created entity id. */
  entity: number;

  /** The attached transform component (always present). */
  transform: UiTransformEcsComponent;

  /**
   * The attached renderable component, or `null` when `style` was not provided.
   */
  renderable: UiRenderableEcsComponent | null;

  /**
   * The attached state component, or `null` when neither `interactable` nor
   * `focusable` was provided.
   */
  state: UiStateEcsComponent | null;
}

/**
 * Creates a UI entity with a {@link UiTransformEcsComponent} and optionally
 * attaches renderable, interactable, focusable, and parent components.
 *
 * This is the low-level building block used by widget factories. It eliminates
 * the boilerplate of creating an entity and attaching the standard set of
 * components — most factories consist of a few `createUiElement` calls followed
 * by event wiring.
 *
 * The optional components are controlled by the `style`, `interactable`, and
 * `focusable` options:
 * - `style` → attaches {@link UiRenderableEcsComponent}
 * - `interactable` → attaches {@link UiInteractableEcsComponent} +
 *   {@link UiStateEcsComponent}
 * - `focusable` → attaches {@link UiFocusableEcsComponent} (and implies
 *   interaction components)
 *
 * @param world - The ECS world to create the entity in.
 * @param options - Transform, parent, and optional component options.
 * @returns The entity id, transform component, and optionally the renderable
 *   and state components.
 */
export function createUiElement(
  world: EcsWorld,
  options: CreateUiElementOptions,
): CreateUiElementResult {
  const {
    parent,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    pivot = new Vector2(0, 0),
    rotation = 0,
    scale = new Vector2(1, 1),
    style,
    interactable,
    focusable,
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

  let renderable: UiRenderableEcsComponent | null = null;

  if (style) {
    renderable = world.addComponent(entity, uiRenderableId, {
      renderable: style.renderable,
      enabled: true,
      tintColor: style.tintColor ?? defaultUiStyleOptions.tintColor,
      borderColor: style.borderColor ?? defaultUiStyleOptions.borderColor,
      borderWidth: style.borderWidth ?? defaultUiStyleOptions.borderWidth,
      cornerRadius: style.cornerRadius ?? defaultUiStyleOptions.cornerRadius,
      opacity: style.opacity ?? defaultUiStyleOptions.opacity,
      zIndex: style.zIndex ?? defaultUiStyleOptions.zIndex,
    });
  }

  let state: UiStateEcsComponent | null = null;

  const needsInteraction =
    interactable !== undefined || focusable !== undefined;

  if (needsInteraction) {
    const disabled = interactable?.disabled ?? false;
    const blocksPointer = interactable?.blocksPointer ?? true;

    world.addComponent(entity, uiInteractableId, {
      enabled: !disabled,
      blocksPointer,
    });

    state = world.addComponent(entity, uiStateId, {
      ...createUiState(),
      disabled,
    });
  }

  if (focusable !== undefined) {
    world.addComponent(entity, uiFocusableId, {
      tabIndex: focusable.tabIndex ?? 0,
      focusable: true,
    });
  }

  if (parent !== undefined) {
    world.addComponent(entity, parentId, { parent });
  }

  return { entity, transform, renderable, state };
}

/**
 * Adds `child` as a child of `parent` by attaching a {@link ParentEcsComponent}
 * to `child`. If `child` already has a parent component its value is replaced.
 *
 * Prefer this over manually attaching `parentId` so that factories never poke
 * parent internals directly, and so reparenting (e.g. for dropdown popups) is
 * a single call.
 *
 * @param world - The ECS world.
 * @param parent - The entity id of the new parent.
 * @param child - The entity id of the child to re-parent.
 */
export function addUiChild(
  world: EcsWorld,
  parent: number,
  child: number,
): void {
  setUiParent(world, child, parent);
}

/**
 * Sets the parent of `child` to `parent`. If `child` already has a
 * {@link ParentEcsComponent} its `parent` field is updated in place; otherwise
 * a new component is attached.
 *
 * @param world - The ECS world.
 * @param child - The entity id of the child.
 * @param parent - The entity id of the new parent.
 */
export function setUiParent(
  world: EcsWorld,
  child: number,
  parent: number,
): void {
  const existing = world.getComponent(child, parentId);

  if (existing !== null) {
    existing.parent = parent;
  } else {
    world.addComponent(child, parentId, { parent });
  }
}
