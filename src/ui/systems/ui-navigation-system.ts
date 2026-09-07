import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Axis2dAction } from '../../input/index.js';
import { Rect, Rects, Vec2, Vector2 } from '../../math/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import {
  UiNavigationDirection,
  uiNavigationDirections,
} from '../types/ui-navigation-direction.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { resolveCanvasGroupState } from '../utilities/resolve-canvas-group-state.js';
import { setUiFocus } from '../utilities/set-ui-focus.js';

/**
 * The minimum `navigateInput` magnitude that counts as "pointing" in a
 * direction. A step is taken on the tick the magnitude first crosses this
 * from below, not every tick the stick is held past it, so holding a
 * direction doesn't repeat-move focus every frame.
 */
const navigationThreshold = 0.5;

interface FocusCandidate {
  entity: number;
  rect: Rect;
}

const directionVectors: Record<UiNavigationDirection, Vector2> = {
  [uiNavigationDirections.up]: { x: 0, y: 1 },
  [uiNavigationDirections.down]: { x: 0, y: -1 },
  [uiNavigationDirections.left]: { x: -1, y: 0 },
  [uiNavigationDirections.right]: { x: 1, y: 0 },
};

function dominantDirection(value: Vector2): UiNavigationDirection {
  if (Math.abs(value.x) > Math.abs(value.y)) {
    return value.x > 0
      ? uiNavigationDirections.right
      : uiNavigationDirections.left;
  }

  return value.y > 0 ? uiNavigationDirections.up : uiNavigationDirections.down;
}

function centerOf(rect: Rect): Vector2 {
  const size = Rects.size(rect);

  return { x: rect.min.x + size.x / 2, y: rect.min.y + size.y / 2 };
}

function isFocusable(world: EcsWorld, entity: number): boolean {
  const interactable = world.getComponent<UiInteractableEcsComponent>(
    entity,
    uiInteractableId,
  );

  return (
    !!interactable?.interactable &&
    resolveCanvasGroupState(world, entity).interactable
  );
}

/** Groups every focusable candidate (own `interactable: true`, and not disabled by an ancestor `CanvasGroupEcsComponent`) into `interactableEntities`/`rectTransforms` by its owning canvas entity. */
function groupFocusCandidatesByCanvas(
  world: EcsWorld,
  interactableEntities: readonly number[],
  interactables: readonly UiInteractableEcsComponent[],
  rectTransforms: readonly RectTransformEcsComponent[],
): Map<number, FocusCandidate[]> {
  const candidatesByCanvas = new Map<number, FocusCandidate[]>();

  for (let i = 0; i < interactableEntities.length; i++) {
    if (
      !interactables[i].interactable ||
      !resolveCanvasGroupState(world, interactableEntities[i]).interactable
    ) {
      continue;
    }

    const owningCanvas = findOwningCanvas(world, interactableEntities[i]);

    if (owningCanvas === null) {
      continue;
    }

    let candidates = candidatesByCanvas.get(owningCanvas);

    if (!candidates) {
      candidates = [];
      candidatesByCanvas.set(owningCanvas, candidates);
    }

    candidates.push({
      entity: interactableEntities[i],
      rect: rectTransforms[i].rect,
    });
  }

  return candidatesByCanvas;
}

/**
 * Finds the focusable candidate nearest `fromCenter` in `direction`: the
 * lowest-scoring candidate whose center lies (at least partly) in that
 * direction, scored by forward distance plus twice its lateral offset
 * (penalizing candidates that are technically "that way" but mostly
 * sideways) - a standard, simple directional nearest-neighbor heuristic.
 */
function findNearestInDirection(
  candidates: readonly FocusCandidate[],
  fromCenter: Vector2,
  direction: UiNavigationDirection,
): number | null {
  const directionVector = directionVectors[direction];

  let bestEntity: number | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const delta = Vec2.subtract(
      Vec2.clone(centerOf(candidate.rect)),
      fromCenter,
    );
    const forward = Vec2.dot(delta, directionVector);

    if (forward <= 0) {
      continue;
    }

    const lateral = Vec2.magnitude(
      Vec2.subtract(
        Vec2.clone(delta),
        Vec2.multiply(Vec2.clone(directionVector), forward),
      ),
    );
    const score = forward + lateral * 2;

    if (score < bestScore) {
      bestScore = score;
      bestEntity = candidate.entity;
    }
  }

  return bestEntity;
}

/** The candidate with the lowest `RectTransformEcsComponent.sortDepth` (the topmost/earliest in hierarchy order). */
function pickTopmostCandidate(
  world: EcsWorld,
  candidates: readonly FocusCandidate[],
): number | null {
  let topmost: number | null = null;
  let topmostSortDepth = Infinity;

  for (const candidate of candidates) {
    const sortDepth = world.getComponent<RectTransformEcsComponent>(
      candidate.entity,
      rectTransformId,
    )!.sortDepth;

    if (topmost === null || sortDepth < topmostSortDepth) {
      topmost = candidate.entity;
      topmostSortDepth = sortDepth;
    }
  }

  return topmost;
}

/** The currently focused entity's explicit `UiFocusEcsComponent` override for `direction`, if it's set and still focusable. */
function resolveExplicitFocusTarget(
  world: EcsWorld,
  focusedEntity: number,
  direction: UiNavigationDirection,
): number | null {
  const focusComponent = world.getComponent(focusedEntity, uiFocusId);
  const explicitTarget = focusComponent?.[direction];

  return explicitTarget !== undefined && isFocusable(world, explicitTarget)
    ? explicitTarget
    : null;
}

/** The next entity to focus for a navigation step in `direction`: an explicit override, else the nearest candidate, else (with nothing focused yet) the topmost one. */
function resolveNextFocusTarget(
  world: EcsWorld,
  canvas: CanvasEcsComponent,
  direction: UiNavigationDirection,
  candidates: readonly FocusCandidate[],
): number | null {
  if (canvas.focusedEntity === null) {
    return pickTopmostCandidate(world, candidates);
  }

  const explicitTarget = resolveExplicitFocusTarget(
    world,
    canvas.focusedEntity,
    direction,
  );

  if (explicitTarget !== null) {
    return explicitTarget;
  }

  const currentRectTransform = world.getComponent<RectTransformEcsComponent>(
    canvas.focusedEntity,
    rectTransformId,
  );

  if (!currentRectTransform) {
    return null;
  }

  return findNearestInDirection(
    candidates.filter((candidate) => candidate.entity !== canvas.focusedEntity),
    centerOf(currentRectTransform.rect),
    direction,
  );
}

/** Applies `canvas.navigateInput`: on the tick its magnitude first crosses `navigationThreshold`, moves focus one step in the dominant direction. */
function applyNavigateInput(
  world: EcsWorld,
  canvas: CanvasEcsComponent,
  candidates: readonly FocusCandidate[],
  wasBeyondThresholdByAction: WeakMap<Axis2dAction, boolean>,
): void {
  if (!canvas.navigateInput) {
    return;
  }

  const value = canvas.navigateInput.value;
  const isBeyondThreshold = Vec2.magnitude(value) >= navigationThreshold;
  const wasBeyondThreshold =
    wasBeyondThresholdByAction.get(canvas.navigateInput) ?? false;

  if (isBeyondThreshold && !wasBeyondThreshold) {
    const next = resolveNextFocusTarget(
      world,
      canvas,
      dominantDirection(value),
      candidates,
    );

    if (next !== null) {
      setUiFocus(world, canvas, next);
    }
  }

  wasBeyondThresholdByAction.set(canvas.navigateInput, isBeyondThreshold);
}

/** Applies `canvas.submitInput`: raises `onInvoke` on the focused element, if any, when it triggers. */
function applySubmitInput(world: EcsWorld, canvas: CanvasEcsComponent): void {
  if (!canvas.submitInput?.isTriggered || canvas.focusedEntity === null) {
    return;
  }

  const focused = world.getComponent<UiInteractableEcsComponent>(
    canvas.focusedEntity,
    uiInteractableId,
  );

  if (
    focused?.interactable &&
    resolveCanvasGroupState(world, canvas.focusedEntity).interactable
  ) {
    focused.wasInvokedThisFrame = true;
    focused.onInvoke.raise();
  }
}

/**
 * Creates a system that drives gamepad/keyboard focus navigation, the
 * counterpart to pointer hover/click that lets a controller or keyboard
 * reach and invoke the same interactables.
 *
 * Every `interactable: true` `UiInteractableEcsComponent` - not disabled by
 * an ancestor `CanvasGroupEcsComponent` either, see `resolveCanvasGroupState`
 * - is automatically focus-navigable: on the tick a canvas's `navigateInput`
 * magnitude first
 * crosses `navigationThreshold`, focus moves to the nearest candidate on
 * the same canvas in the dominant direction (a `UiFocusEcsComponent` on the
 * currently focused entity overrides that search on whichever sides it
 * sets). `submitInput` raises `onInvoke` on the focused element;
 * `cancelInput` clears focus - register your own listener on
 * `cancelInput.triggerEvent` for bespoke "close this menu" behavior.
 *
 * Also resets every `UiInteractableEcsComponent.wasInvokedThisFrame` to
 * `false` at the start of its tick, before re-setting it for this tick's
 * submit invocation - the single point in the pipeline responsible for that
 * reset (see `createUiInteractionEcsSystem`, which only ever sets it `true`
 * for the pointer path and relies on this system having already cleared
 * it this tick). Always register this system - even on a canvas with no
 * `submitInput`/`cancelInput`/`navigateInput` configured - or
 * `wasInvokedThisFrame` never clears; `createUiCanvas` does this for you.
 *
 * Must be registered after `createUiRaycastEcsSystem` (if present) and
 * before `createUiInteractionEcsSystem`.
 * @returns The UI navigation ECS system.
 */
export const createUiNavigationEcsSystem = (): EcsSystem<
  [CanvasEcsComponent]
> => {
  const wasBeyondThresholdByAction = new WeakMap<Axis2dAction, boolean>();

  return {
    name: 'uiNavigation',
    query: [canvasId],
    update: (world, { entities: canvasEntities, components: [canvases] }) => {
      const {
        entities: interactableEntities,
        components: [interactables, rectTransforms],
      } = world.query<[UiInteractableEcsComponent, RectTransformEcsComponent]>([
        uiInteractableId,
        rectTransformId,
      ]);

      for (const interactable of interactables) {
        interactable.wasInvokedThisFrame = false;
      }

      const candidatesByCanvas = groupFocusCandidatesByCanvas(
        world,
        interactableEntities,
        interactables,
        rectTransforms,
      );

      for (let c = 0; c < canvasEntities.length; c++) {
        const canvasEntity = canvasEntities[c];
        const canvas = canvases[c];

        if (canvas.cancelInput?.isTriggered) {
          setUiFocus(world, canvas, null);
        }

        applyNavigateInput(
          world,
          canvas,
          candidatesByCanvas.get(canvasEntity) ?? [],
          wasBeyondThresholdByAction,
        );
        applySubmitInput(world, canvas);
      }
    },
  };
};
