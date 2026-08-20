import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import { Vector2 } from '../../math/index.js';
import { UiScaleMode, uiScaleModes } from '../types/ui-scale-mode.js';

/**
 * Fields of {@link CanvasEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface CanvasRequiredOptions {
  /**
   * The entity id of the dedicated UI camera this canvas draws through (see
   * `createUiCanvas`). `createUiLayoutEcsSystem` keeps this camera's
   * `verticalWorldUnits` in sync with the canvas's resolved root rect every
   * frame.
   */
  camera: number;
}

/**
 * Fields of {@link CanvasEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface CanvasDefaultedOptions {
  /**
   * The resolution UI is authored against, in reference pixels (UI world
   * units). Defaults to `1920x1080`. How the canvas's root rect departs from
   * this at other destination sizes/aspect ratios is controlled by
   * `scaleMode`.
   */
  referenceResolution: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode: UiScaleMode;
}

/**
 * Optional `InputAction`s driving this canvas's gamepad/keyboard focus
 * navigation. All optional - a canvas with none of these is still fully
 * pointer-interactive, just not focus-navigable.
 */
export interface CanvasInputOptions {
  /**
   * The action that raises `onInvoke` on the currently focused interactable
   * - the gamepad/keyboard counterpart to a pointer click, read by
   * `createUiNavigationEcsSystem`. Omit to leave this canvas's focused
   * element only invocable by pointer.
   */
  submitInput?: TriggerAction;

  /**
   * The action that clears this canvas's currently focused element, read by
   * `createUiNavigationEcsSystem`. Register your own listener on
   * `cancelInput.triggerEvent` (e.g. to close a menu) - the canvas itself
   * only clears focus.
   */
  cancelInput?: TriggerAction;

  /**
   * The action that moves this canvas's focus between interactable
   * elements, read by `createUiNavigationEcsSystem`. A step is taken on the
   * tick the dominant axis first crosses `navigationThreshold`, not every
   * tick the stick is held over.
   */
  navigateInput?: Axis2dAction;
}

export interface CanvasEcsComponent
  extends CanvasRequiredOptions, CanvasDefaultedOptions, CanvasInputOptions {
  /**
   * Whether the pointer is currently over any raycast-blocking interactable
   * on this canvas. Written every frame by `createUiRaycastEcsSystem` so
   * game systems can gate world interaction ("don't fire the weapon when
   * the click landed on the pause button") without guessing. Read-only to
   * callers.
   */
  isPointerOverUi: boolean;

  /**
   * The entity id the pointer is currently over on this canvas (the
   * topmost raycast-blocking element under it), or `null` if none. Written
   * every frame by `createUiRaycastEcsSystem`; `isPointerOverUi` is exactly
   * `hoveredEntity !== null`. Read-only to callers.
   */
  hoveredEntity: number | null;

  /**
   * The entity id of this canvas's currently focused interactable - the
   * source-agnostic "currently selected element" (see
   * `UiInteractableEcsComponent.isFocused`) - or `null` if none. Written by
   * `createUiNavigationEcsSystem` (directional navigation, `cancelInput`)
   * and `createUiInteractionEcsSystem` (the pointer moving over an
   * interactable also focuses it, so the highlight follows the mouse).
   * Read-only to callers.
   */
  focusedEntity: number | null;
}

export const canvasId = createComponentId<CanvasEcsComponent>('canvas');

const defaultCanvasOptions: CanvasDefaultedOptions & {
  isPointerOverUi: boolean;
  hoveredEntity: number | null;
  focusedEntity: number | null;
} = {
  referenceResolution: { x: 1920, y: 1080 },
  scaleMode: uiScaleModes.scaleWithScreenSize,
  isPointerOverUi: false,
  hoveredEntity: null,
  focusedEntity: null,
};

/**
 * Attaches a {@link CanvasEcsComponent} to `entity`. A canvas also needs a
 * `RectTransformEcsComponent` (its root rect, resolved every frame from
 * `referenceResolution`/`scaleMode` rather than a parent) and a
 * `PositionEcsComponent`; use `createUiCanvas` to get a fully wired canvas
 * entity - including its dedicated camera - in one call.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the canvas. `camera` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addCanvasComponent(
  world: EcsWorld,
  entity: number,
  options: CanvasRequiredOptions &
    Partial<CanvasDefaultedOptions> &
    CanvasInputOptions,
): CanvasEcsComponent {
  const component: CanvasEcsComponent = {
    ...defaultCanvasOptions,
    ...options,
  };

  return world.addComponent(entity, canvasId, component);
}
