import { EcsWorld } from '../../ecs/ecs-world.js';
import { QueryMatches } from '../../ecs/query-result.js';
import { Rects, Vector2 } from '../../math/index.js';
import {
  CameraEcsComponent,
  cameraId,
  isVisibleInHierarchy,
  MaskEcsComponent,
  maskId,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '../../rendering/index.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { UiInteractableEcsComponent } from '../components/ui-interactable-component.js';
import { findOwningCanvas } from './find-owning-canvas.js';
import { resolveCanvasGroupState } from './resolve-canvas-group-state.js';
import { resolveCanvasPointerPosition } from './resolve-canvas-pointer-position.js';
import { sortByDrawOrder } from './sort-by-draw-order.js';

/**
 * Whether `camera` can actually see `entity` - `true` when `entity` has no
 * `SpriteEcsComponent` (an invisible hit region has nothing to cull) or its
 * `category` matches the camera's `cullingMask`. An element
 * culled from its canvas's camera must not be clickable either, or the UI
 * develops invisible hit regions.
 */
function isVisibleToCamera(
  world: EcsWorld,
  entity: number,
  camera: CameraEcsComponent | null,
): boolean {
  const sprite = world.getComponent<SpriteEcsComponent>(entity, spriteId);

  if (!sprite) {
    return true;
  }

  return !!camera && matchesMask(sprite.category, camera.cullingMask);
}

/**
 * Whether `point` lies inside the rect of every rect mask (see
 * `MaskEcsComponent`) on `entity` or its ancestors up to its canvas, so a
 * part a mask clips away - a list item scrolled out of a scroll view - can't
 * be clicked. A mask's rect is its element's resolved rect, which
 * `createUiLayoutEcsSystem` sizes it to. Linear and radial masks reveal part
 * of a fill and don't clip hits.
 */
function isInsideMasks(
  world: EcsWorld,
  entity: number,
  point: Vector2,
): boolean {
  for (
    let current: number | null = entity;
    current !== null;
    current = world.getParent(current)
  ) {
    const mask = world.getComponent<MaskEcsComponent>(current, maskId);
    const rectTransform = world.getComponent<RectTransformEcsComponent>(
      current,
      rectTransformId,
    );

    if (
      mask?.shape.kind === 'rect' &&
      rectTransform &&
      !Rects.contains(rectTransform.rect, point)
    ) {
      return false;
    }

    if (world.getComponent(current, canvasId) !== null) {
      return true;
    }
  }

  return true;
}

/**
 * Finds the topmost `UiInteractableEcsComponent` on `canvasEntity`'s canvas
 * under a pointer position: the canvas's interactables are scanned in
 * reverse draw order (drawn on top first, see `sortByDrawOrder`), for the
 * first whose resolved `rect` contains the position - a linear scan: element
 * counts here are in the hundreds, not the hundreds of thousands, so a
 * plain scan is a few microseconds with no acceleration structure to build
 * or invalidate. An element with `blocksRaycasts: false` is transparent to
 * the scan (never considered, hit or not) - so is one with an ancestor
 * `CanvasGroupEcsComponent` whose own `blocksRaycasts` is `false` (see
 * `resolveCanvasGroupState`), and so is one hidden in the hierarchy (see
 * `VisibilityEcsComponent`); an element culled from the canvas's camera
 * by `cullingMask` is skipped the same way an invisible element shouldn't
 * be clickable, and so is the part of an element a rect
 * `MaskEcsComponent` on it or an ancestor clips away.
 *
 * `createUiRaycastEcsSystem` calls this once per canvas per tick. It's a
 * plain function so code that has to react inside a DOM event handler
 * (e.g. `createUiTextInputEcsSystem` focusing a text field during a tap, so
 * a phone opens its keyboard) gets the same answer, occlusion included.
 * Reads the rects `createUiLayoutEcsSystem` resolved on the last tick.
 * @param world - The ECS world the canvas belongs to.
 * @param canvasEntity - The canvas entity to hit-test.
 * @param renderContext - The render context the canvas's camera renders
 * through, used to convert the pointer position.
 * @param viewportPosition - The pointer position, in CSS pixels from the
 * canvas's top-left corner, Y-down.
 * @param interactables - Every entity with a `UiInteractableEcsComponent`
 * and a `RectTransformEcsComponent`, and those components: a system's
 * declared query for them, or `world.query`'s result outside a system.
 * @returns The topmost hit entity, or `null` if nothing was hit (or the
 * canvas's camera can't convert the position).
 */
export function raycastUiCanvas(
  world: EcsWorld,
  canvasEntity: number,
  renderContext: RenderContext,
  viewportPosition: Vector2,
  interactables: QueryMatches<
    [UiInteractableEcsComponent, RectTransformEcsComponent]
  >,
): number | null {
  const canvas = world.getComponentRequired<CanvasEcsComponent>(
    canvasEntity,
    canvasId,
  );
  const pointerPosition = resolveCanvasPointerPosition(
    world,
    canvas,
    renderContext,
    viewportPosition,
  );

  if (!pointerPosition) {
    return null;
  }

  const {
    entities,
    components: [interactableComponents, rectTransforms],
  } = interactables;

  const candidates: number[] = [];
  const rectTransformByEntity = new Map<number, RectTransformEcsComponent>();

  for (let i = 0; i < entities.length; i++) {
    if (
      interactableComponents[i].blocksRaycasts &&
      findOwningCanvas(world, entities[i]) === canvasEntity &&
      isVisibleInHierarchy(world, entities[i])
    ) {
      candidates.push(entities[i]);
      rectTransformByEntity.set(entities[i], rectTransforms[i]);
    }
  }

  sortByDrawOrder(world, candidates);

  const camera = world.getComponent<CameraEcsComponent>(
    canvas.camera,
    cameraId,
  );

  for (let i = candidates.length - 1; i >= 0; i--) {
    const entity = candidates[i];

    if (
      !isVisibleToCamera(world, entity, camera) ||
      !resolveCanvasGroupState(world, entity).blocksRaycasts
    ) {
      continue;
    }

    if (
      Rects.contains(
        rectTransformByEntity.get(entity)!.rect,
        pointerPosition,
      ) &&
      isInsideMasks(world, entity, pointerPosition)
    ) {
      return entity;
    }
  }

  return null;
}
