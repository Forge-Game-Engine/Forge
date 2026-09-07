import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import { Vector2 } from '../../math/index.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
import { UiScaleMode, uiScaleModes } from '../types/ui-scale-mode.js';

/**
 * `AddCanvasComponentOptions`/`CanvasEcsComponent` fields specific to a
 * `renderMode: 'screenSpace'` canvas (the default) - resolved every frame by
 * `createUiLayoutEcsSystem` from the render destination's live size, per
 * `scaleMode`. Rejected at compile time on a `'worldSpace'` canvas, which has
 * no "destination size" to scale against.
 */
export interface ScreenSpaceCanvasFields {
  renderMode?: typeof uiCanvasRenderModes.screenSpace;

  /**
   * The resolution UI is authored against, in reference pixels. Defaults to
   * `1920x1080`.
   */
  referenceResolution?: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode?: UiScaleMode;
}

/**
 * `AddCanvasComponentOptions`/`CanvasEcsComponent` fields specific to a
 * `renderMode: 'worldSpace'` canvas.
 */
export interface WorldSpaceCanvasFields {
  renderMode: typeof uiCanvasRenderModes.worldSpace;
}

/**
 * Optional `InputAction`s driving a canvas's gamepad/keyboard focus
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

export type AddCanvasComponentOptions = (
  ScreenSpaceCanvasFields | WorldSpaceCanvasFields
) &
  CanvasInputOptions & {
    /**
     * The entity id of the camera this canvas draws through. For
     * `renderMode: 'screenSpace'` (the default), this is the dedicated UI
     * camera `createUiCanvas` creates, and `createUiLayoutEcsSystem` keeps
     * its `verticalWorldUnits` in sync with the canvas's resolved root rect
     * every frame. For `renderMode: 'worldSpace'`, this is typically the
     * game's own world camera - `createUiLayoutEcsSystem` never mutates it,
     * since a world-space canvas's rect comes from its own
     * `RectTransformEcsComponent` and entity hierarchy, not the render
     * destination's size.
     */
    camera: number;
  };

type ResolvedScreenSpaceCanvasFields = Required<
  Pick<ScreenSpaceCanvasFields, 'referenceResolution' | 'scaleMode'>
> & {
  renderMode: typeof uiCanvasRenderModes.screenSpace;
};

export type CanvasEcsComponent = (
  ResolvedScreenSpaceCanvasFields | WorldSpaceCanvasFields
) &
  CanvasInputOptions & {
    camera: number;

    /**
     * Whether the pointer is currently over any raycast-blocking
     * interactable on this canvas. Written every frame by
     * `createUiRaycastEcsSystem` so game systems can gate world interaction
     * ("don't fire the weapon when the click landed on the pause button")
     * without guessing. Read-only to callers.
     */
    isPointerOverUi: boolean;

    /**
     * The entity id the pointer is currently over on this canvas (the
     * topmost raycast-blocking element under it), or `null` if none.
     * Written every frame by `createUiRaycastEcsSystem`;
     * `isPointerOverUi` is exactly `hoveredEntity !== null`. Read-only to
     * callers.
     */
    hoveredEntity: number | null;

    /**
     * The entity id of this canvas's currently focused interactable - the
     * source-agnostic "currently selected element" (see
     * `UiInteractableEcsComponent.isFocused`) - or `null` if none. Written
     * by `createUiNavigationEcsSystem` (directional navigation,
     * `cancelInput`) and `createUiInteractionEcsSystem` (the pointer moving
     * over an interactable also focuses it, so the highlight follows the
     * mouse). Read-only to callers.
     */
    focusedEntity: number | null;
  };

export const canvasId = createComponentId<CanvasEcsComponent>('canvas');

const defaultScreenSpaceCanvasFields: Pick<
  ResolvedScreenSpaceCanvasFields,
  'referenceResolution' | 'scaleMode'
> = {
  referenceResolution: { x: 1920, y: 1080 },
  scaleMode: uiScaleModes.scaleWithScreenSize,
};

/**
 * Attaches a {@link CanvasEcsComponent} to `entity`. A canvas also needs a
 * `RectTransformEcsComponent` and a `PositionEcsComponent` - for
 * `renderMode: 'screenSpace'` (the default), the rect is resolved every
 * frame from `referenceResolution`/`scaleMode` rather than a parent; for
 * `'worldSpace'`, it's an ordinary rect positioned via the entity hierarchy
 * like any other UI element. Use `createUiCanvas` to get a fully wired
 * canvas entity - including its camera for `'screenSpace'` mode - in one
 * call.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the canvas. `camera` has no
 * sensible default and must always be provided; which of the other fields
 * are available depends on `renderMode` (see {@link ScreenSpaceCanvasFields}
 * / {@link WorldSpaceCanvasFields}).
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addCanvasComponent(
  world: EcsWorld,
  entity: number,
  options: AddCanvasComponentOptions,
): CanvasEcsComponent {
  const runtimeState = {
    isPointerOverUi: false,
    hoveredEntity: null,
    focusedEntity: null,
  };

  const component: CanvasEcsComponent =
    options.renderMode === uiCanvasRenderModes.worldSpace
      ? { ...options, ...runtimeState }
      : {
          ...defaultScreenSpaceCanvasFields,
          ...options,
          renderMode: uiCanvasRenderModes.screenSpace,
          ...runtimeState,
        };

  return world.addComponent(entity, canvasId, component);
}
