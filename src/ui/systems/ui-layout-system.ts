import { parentId } from '../../common/components/parent-component.js';
import {
  createTransformCache,
  resetTransformCache,
  TransformCache,
} from '../../common/systems/transform-cache.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { uiCanvasId } from '../components/ui-canvas-component.js';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';

/**
 * Per-frame state passed from `beforeQuery` to each `run` invocation.
 * Persists across frames so the `frozen` set survives without reallocation.
 */
interface LayoutRunState {
  cache: TransformCache;
  /**
   * Entities whose layout is static and already computed. Checked each frame;
   * cleared for a specific entity only when `isStatic` becomes false (e.g.
   * after entity-id recycling).
   */
  frozen: Set<number>;
}

interface ParentRect {
  originX: number;
  originY: number;
  sizeX: number;
  sizeY: number;
  entity: number | null;
}

export function computeUiWorldMatrix(transform: UiTransformEcsComponent): void {
  const { origin, size } = transform.resolvedRect;
  const pivotX = transform.pivot.x * size.x;
  const pivotY = transform.pivot.y * size.y;

  transform.worldMatrix
    .resetToIdentity()
    .translate(origin.x + pivotX, origin.y + pivotY)
    .rotate(transform.rotation)
    .scale(transform.scale.x, transform.scale.y)
    .translate(-pivotX, -pivotY)
    .scale(size.x, size.y);
}

function resolveParentRect(
  entity: number,
  world: EcsWorld,
  cache: TransformCache,
  frozen: Set<number>,
): ParentRect {
  const parentComp = world.getComponent(entity, parentId);

  if (!parentComp) {
    return { originX: 0, originY: 0, sizeX: 0, sizeY: 0, entity: null };
  }

  const parentEntity = parentComp.parent;
  computeLayout(parentEntity, world, cache, frozen);

  const parentTransform = world.getComponent(parentEntity, uiTransformId);

  if (parentTransform) {
    return {
      originX: parentTransform.resolvedRect.origin.x,
      originY: parentTransform.resolvedRect.origin.y,
      sizeX: parentTransform.resolvedRect.size.x,
      sizeY: parentTransform.resolvedRect.size.y,
      entity: parentEntity,
    };
  }

  const parentCanvas = world.getComponent(parentEntity, uiCanvasId);

  if (parentCanvas) {
    return {
      originX: 0,
      originY: 0,
      sizeX: parentCanvas.width,
      sizeY: parentCanvas.height,
      entity: parentEntity,
    };
  }

  return { originX: 0, originY: 0, sizeX: 0, sizeY: 0, entity: parentEntity };
}

function applyAnchorLayout(
  transform: UiTransformEcsComponent,
  parent: ParentRect,
): void {
  const anchorMinX = parent.originX + transform.anchorMin.x * parent.sizeX;
  const anchorMinY = parent.originY + transform.anchorMin.y * parent.sizeY;
  const anchorMaxX = parent.originX + transform.anchorMax.x * parent.sizeX;
  const anchorMaxY = parent.originY + transform.anchorMax.y * parent.sizeY;

  transform.resolvedRect.origin.x = anchorMinX + transform.offsetMin.x;
  transform.resolvedRect.origin.y = anchorMinY + transform.offsetMin.y;
  transform.resolvedRect.size.x =
    anchorMaxX + transform.offsetMax.x - transform.resolvedRect.origin.x;
  transform.resolvedRect.size.y =
    anchorMaxY + transform.offsetMax.y - transform.resolvedRect.origin.y;
  transform.isDirty = false;
}

function computeLayout(
  entity: number,
  world: EcsWorld,
  cache: TransformCache,
  frozen: Set<number>,
): void {
  // Static entities can be skipped if still marked static. Guard against
  // entity-id recycling by re-checking the component.
  if (frozen.has(entity)) {
    const transform = world.getComponent(entity, uiTransformId);

    if (transform?.isStatic && !transform.isDirty) {
      return;
    }

    frozen.delete(entity);
  }

  if (cache.computed.has(entity)) {
    return;
  }

  // Cycle detection: break cycles by treating the re-entered entity as a root.
  if (cache.visiting.has(entity)) {
    const transform = world.getComponent(entity, uiTransformId);

    if (transform) {
      transform.resolvedRect.origin.x = 0;
      transform.resolvedRect.origin.y = 0;
      transform.resolvedRect.size.x = 0;
      transform.resolvedRect.size.y = 0;
      computeUiWorldMatrix(transform);
    }

    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    cache.visiting.delete(entity);

    return;
  }

  // Canvas entities define the root rect from their own dimensions.
  const canvas = world.getComponent(entity, uiCanvasId);

  if (canvas) {
    transform.resolvedRect.origin.x = 0;
    transform.resolvedRect.origin.y = 0;
    transform.resolvedRect.size.x = canvas.width;
    transform.resolvedRect.size.y = canvas.height;
    canvas.isDirty = false;
    computeUiWorldMatrix(transform);
    cache.visiting.delete(entity);
    cache.computed.add(entity);

    if (transform.isStatic) {
      frozen.add(entity);
    }

    return;
  }

  const parent = resolveParentRect(entity, world, cache, frozen);

  applyAnchorLayout(transform, parent);
  computeUiWorldMatrix(transform);

  cache.visiting.delete(entity);
  cache.computed.add(entity);

  if (
    transform.isStatic &&
    parent.entity !== null &&
    frozen.has(parent.entity)
  ) {
    frozen.add(entity);
  }
}

type UiLayoutSystem = EcsSystem<[UiTransformEcsComponent], LayoutRunState>;

/**
 * Creates the UI layout system that resolves anchor/offset geometry into
 * screen-space `resolvedRect` and `worldMatrix` values on every frame.
 *
 * ## Ordering
 * Process parents before children by recursing up the hierarchy (mirroring
 * `createTransformEcsSystem`). A per-frame visited set prevents redundant work
 * and cycle-safe.
 *
 * ## Static optimisation
 * Entities with `UiTransformEcsComponent.isStatic === true` whose entire
 * parent chain is also static are added to a persistent `frozen` set and
 * skipped on subsequent frames. This optimisation is validated in Epic 9;
 * the default `isStatic = false` means all entities recompute every frame.
 *
 * @returns The UI layout ECS system.
 */
export const createUiLayoutEcsSystem = (): UiLayoutSystem => {
  const state: LayoutRunState = {
    cache: createTransformCache(),
    frozen: new Set<number>(),
  };

  return {
    query: [uiTransformId],

    beforeQuery: () => {
      resetTransformCache(state.cache);

      return state;
    },

    run: (result, world, { cache, frozen }) => {
      computeLayout(result.entity, world, cache, frozen);
    },
  };
};
