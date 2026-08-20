import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rects } from '../../math/index.js';
import {
  CameraEcsComponent,
  cameraId,
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
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { UiPointerSource } from '../types/ui-pointer-source.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';
import { resolveCanvasPointerPosition } from '../utilities/resolve-canvas-pointer-position.js';

/**
 * Whether `camera` can actually see `entity` - `true` when `entity` has no
 * `SpriteEcsComponent` (an invisible hit region has nothing to cull) or its
 * `Renderable.category` matches the camera's `cullingMask`. An element
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

  return (
    !!camera && matchesMask(sprite.renderable.category, camera.cullingMask)
  );
}

/** Groups interactable indices (into `interactableEntities`/`rectTransforms`) by their owning canvas entity. */
function groupInteractableIndicesByCanvas(
  world: EcsWorld,
  interactableEntities: readonly number[],
): Map<number, number[]> {
  const indicesByCanvas = new Map<number, number[]>();

  for (let i = 0; i < interactableEntities.length; i++) {
    const owningCanvas = findOwningCanvas(world, interactableEntities[i]);

    if (owningCanvas === null) {
      continue;
    }

    let indices = indicesByCanvas.get(owningCanvas);

    if (!indices) {
      indices = [];
      indicesByCanvas.set(owningCanvas, indices);
    }

    indices.push(i);
  }

  return indicesByCanvas;
}

/**
 * Scans `indices` (already sorted topmost-first) for the first one whose
 * `blocksRaycasts` interactable is visible to `camera` and whose resolved
 * rect contains `pointerPosition`.
 */
function findRaycastHit(
  world: EcsWorld,
  indices: readonly number[],
  interactableEntities: readonly number[],
  interactables: readonly UiInteractableEcsComponent[],
  rectTransforms: readonly RectTransformEcsComponent[],
  camera: CameraEcsComponent | null,
  pointerPosition: ReturnType<typeof resolveCanvasPointerPosition>,
): number | null {
  if (!pointerPosition) {
    return null;
  }

  for (const index of indices) {
    if (!interactables[index].blocksRaycasts) {
      continue;
    }

    const entity = interactableEntities[index];

    if (!isVisibleToCamera(world, entity, camera)) {
      continue;
    }

    if (Rects.contains(rectTransforms[index].rect, pointerPosition)) {
      return entity;
    }
  }

  return null;
}

/**
 * Creates a system that, per `CanvasEcsComponent`, converts the pointer
 * source's position into that canvas's UI world space and scans its
 * `UiInteractableEcsComponent`s in reverse hierarchy order (topmost first,
 * by `RectTransformEcsComponent.sortDepth`) for the first whose resolved
 * `rect` contains it - a linear reverse-depth scan: element counts here are
 * in the hundreds, not the hundreds of thousands, so a plain scan is a few
 * microseconds with no acceleration structure to build or invalidate. An
 * element with `blocksRaycasts: false` is transparent to the scan (never
 * considered, hit or not); an element culled from the canvas's camera by
 * `cullingMask` is skipped the same way an invisible element shouldn't be
 * clickable.
 *
 * Writes `CanvasEcsComponent.hoveredEntity` (the topmost hit, or `null`) and
 * `isPointerOverUi` (`hoveredEntity !== null`) every tick - read by
 * `createUiInteractionEcsSystem` and by game systems wanting to gate world
 * interaction on "did this click land on the UI".
 *
 * Must be registered after `createUiLayoutEcsSystem` (it reads the rects/
 * sortDepths that system resolves) and before `createUiInteractionEcsSystem`.
 * @param pointerSource - The pointer source hit-tested against.
 * @param renderContext - The render context canvases' cameras render
 * through, used to convert the pointer position.
 * @returns The UI raycast ECS system.
 */
export const createUiRaycastEcsSystem = (
  pointerSource: UiPointerSource,
  renderContext: RenderContext,
): EcsSystem<[CanvasEcsComponent]> => ({
  name: 'uiRaycast',
  query: [canvasId],
  update: (world, { entities: canvasEntities, components: [canvases] }) => {
    const {
      entities: interactableEntities,
      components: [interactables, rectTransforms],
    } = world.query<[UiInteractableEcsComponent, RectTransformEcsComponent]>([
      uiInteractableId,
      rectTransformId,
    ]);

    const indicesByCanvas = groupInteractableIndicesByCanvas(
      world,
      interactableEntities,
    );

    for (let c = 0; c < canvasEntities.length; c++) {
      const canvasEntity = canvasEntities[c];
      const canvas = canvases[c];

      const indices = indicesByCanvas.get(canvasEntity) ?? [];

      indices.sort(
        (a, b) => rectTransforms[b].sortDepth - rectTransforms[a].sortDepth,
      );

      const pointerPosition = resolveCanvasPointerPosition(
        world,
        canvas,
        renderContext,
        pointerSource,
      );

      const camera = world.getComponent<CameraEcsComponent>(
        canvas.camera,
        cameraId,
      );

      const hitEntity = findRaycastHit(
        world,
        indices,
        interactableEntities,
        interactables,
        rectTransforms,
        camera,
        pointerPosition,
      );

      canvas.hoveredEntity = hitEntity;
      canvas.isPointerOverUi = hitEntity !== null;
    }
  },
});
