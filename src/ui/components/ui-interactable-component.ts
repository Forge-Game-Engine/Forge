import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';

/**
 * Fields of {@link UiInteractableEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface UiInteractableDefaultedOptions {
  /**
   * Whether this element participates in interaction at all - receives
   * hover/press/focus and raises `onActivate`. A `false` interactable is
   * skipped by `createUiNavigationEcsSystem`'s focus traversal, and (unlike
   * `blocksRaycasts`) still blocks the raycast for elements behind it if
   * `blocksRaycasts` is `true`, the same way a disabled button still shadows
   * whatever is under it.
   */
  interactable: boolean;

  /**
   * Whether this element is considered by `createUiRaycastEcsSystem` at
   * all. `false` makes the element fully transparent to raycasting - the
   * pointer passes through to whatever is behind it - regardless of
   * `interactable`. Set `false` on a purely decorative interactable (rare)
   * or a temporarily inert one.
   */
  blocksRaycasts: boolean;

  /**
   * How far, in reference pixels (UI world units), the pointer must move
   * from its press-down position before a held press becomes a drag (see
   * `createUiInteractionEcsSystem`'s pointer state machine).
   */
  dragThreshold: number;
}

/**
 * A rect that participates in pointer/gamepad interaction. Attach alongside
 * a `RectTransformEcsComponent` (see `design/ui-system.md`'s "Anatomy of a
 * button") to make any rect - not just a button - clickable, hoverable, and
 * focus-navigable: a toggle, a slider handle, a list row, a close icon.
 *
 * Activation is source-agnostic (`design/ui-system.md`'s DL-14):
 * `onActivate` is raised both by a pointer release on this element (via
 * `createUiInteractionEcsSystem`) and by `submitInput` while this element is
 * focused (via `createUiNavigationEcsSystem`), and the listener cannot tell
 * which fired it.
 */
export interface UiInteractableEcsComponent extends UiInteractableDefaultedOptions {
  /** Raised when this element is activated, by a pointer or a submit action. */
  readonly onActivate: ForgeEvent;

  /** Raised when the pointer starts being over this element. Pointer-only. */
  readonly onPointerEnter: ForgeEvent;

  /** Raised when the pointer stops being over this element. Pointer-only. */
  readonly onPointerExit: ForgeEvent;

  /** Raised on a pointer-down edge landing on this element. Pointer-only. */
  readonly onPointerDown: ForgeEvent;

  /**
   * Raised on a pointer-up edge, when this element captured the matching
   * press (see `isPressed`) - whether or not the pointer is still over it.
   * Pointer-only.
   */
  readonly onPointerUp: ForgeEvent;

  /**
   * Raised when a captured press first exceeds `dragThreshold`. Pointer-only
   * - a drag has no gamepad/keyboard analogue.
   */
  readonly onBeginDrag: ForgeEvent;

  /** Raised every tick the pointer moves while `isDragging`. Pointer-only. */
  readonly onDrag: ForgeEvent;

  /** Raised on the pointer-up edge that ends a drag. Pointer-only. */
  readonly onEndDrag: ForgeEvent;

  /**
   * Whether the pointer is currently over this element. Pointer-only -
   * always `false` when navigating by gamepad/keyboard. System-owned,
   * written by `createUiInteractionEcsSystem`; read-only to callers.
   */
  isHovered: boolean;

  /**
   * Whether this is the canvas's currently focused element - the
   * source-agnostic "currently selected" state driven by directional
   * navigation and, by canvas policy, by the pointer hovering this element.
   * System-owned, written by `createUiNavigationEcsSystem` and
   * `createUiInteractionEcsSystem`; read-only to callers.
   */
  isFocused: boolean;

  /**
   * Whether this element currently holds a captured press *and* the pointer
   * is still over it (see `design/ui-system.md`'s §5.7 - moving the pointer
   * off a held-down element visually un-presses it without cancelling the
   * gesture; `pressCapture` tracks the gesture itself). System-owned,
   * written by `createUiInteractionEcsSystem`; read-only to callers.
   */
  isPressed: boolean;

  /**
   * Whether a captured press on this element has exceeded `dragThreshold`.
   * System-owned, written by `createUiInteractionEcsSystem`; read-only to
   * callers.
   */
  isDragging: boolean;

  /**
   * `true` for exactly one tick: the tick `onActivate` was raised, from
   * either the pointer or the focus path. Poll this instead of registering
   * an `onActivate` listener when that idiom fits better. System-owned,
   * written by `createUiInteractionEcsSystem` and
   * `createUiNavigationEcsSystem`; read-only to callers.
   */
  wasActivatedThisFrame: boolean;

  /**
   * System-owned bookkeeping `createUiInteractionEcsSystem` uses to track an
   * in-progress press/drag gesture across ticks between a pointer down and
   * its matching up - non-`null` from the down edge until the matching up
   * edge, regardless of whether the pointer stays over the element in
   * between (so `isPressed`/drag-threshold/`onActivate` all resolve
   * correctly even if the pointer wanders off and back). `originPosition`
   * is the pointer's position, in its canvas's UI world space, at the tick
   * the press began - what `dragThreshold` is measured against. Not part of
   * the public state surface - read
   * `isPressed`/`isDragging`/`wasActivatedThisFrame` instead of this
   * directly.
   */
  pressCapture: { originPosition: Vector2 } | null;
}

export const uiInteractableId =
  createComponentId<UiInteractableEcsComponent>('uiInteractable');

const defaultUiInteractableOptions: UiInteractableDefaultedOptions = {
  interactable: true,
  blocksRaycasts: true,
  dragThreshold: 8,
};

/**
 * Attaches a {@link UiInteractableEcsComponent} to `entity`. Needs a
 * `RectTransformEcsComponent` on the same entity (or a parent chain
 * resolving to one) for `createUiRaycastEcsSystem` to hit-test against; use
 * `createButton` for the common "clickable rect with a label" case.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the interactable.
 * @returns The attached component, for further tuning, listening to its
 * events, or reading its interaction state.
 */
export function addUiInteractableComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiInteractableDefaultedOptions> = {},
): UiInteractableEcsComponent {
  const component: UiInteractableEcsComponent = {
    ...defaultUiInteractableOptions,
    ...options,

    onActivate: new ForgeEvent('uiInteractable.onActivate'),
    onPointerEnter: new ForgeEvent('uiInteractable.onPointerEnter'),
    onPointerExit: new ForgeEvent('uiInteractable.onPointerExit'),
    onPointerDown: new ForgeEvent('uiInteractable.onPointerDown'),
    onPointerUp: new ForgeEvent('uiInteractable.onPointerUp'),
    onBeginDrag: new ForgeEvent('uiInteractable.onBeginDrag'),
    onDrag: new ForgeEvent('uiInteractable.onDrag'),
    onEndDrag: new ForgeEvent('uiInteractable.onEndDrag'),

    isHovered: false,
    isFocused: false,
    isPressed: false,
    isDragging: false,
    wasActivatedThisFrame: false,
    pressCapture: null,
  };

  return world.addComponent(entity, uiInteractableId, component);
}
