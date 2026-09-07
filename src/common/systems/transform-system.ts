import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2 } from '../../math/index.js';
import {
  PositionEcsComponent,
  positionId,
  rotationId,
  scaleId,
} from '../components/index.js';
import { parentId } from '../components/parent-component.js';
import {
  createTransformCache,
  resetTransformCache,
  TransformCache,
} from './transform-cache.js';

function setLocalAsWorldIfExists(entity: number, world: EcsWorld): void {
  const positionComponent = world.getComponent(entity, positionId);

  if (positionComponent) {
    positionComponent.world.x = positionComponent.local.x;
    positionComponent.world.y = positionComponent.local.y;
  }

  const rotationComponent = world.getComponent(entity, rotationId);

  if (rotationComponent) {
    rotationComponent.world = rotationComponent.local;
  }

  const scaleComponent = world.getComponent(entity, scaleId);

  if (scaleComponent) {
    scaleComponent.world = scaleComponent.local;
  }
}

function composePositionWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
): void {
  const positionComponent = world.getComponent(entity, positionId);

  if (!positionComponent) {
    return;
  }

  const parentPosition = world.getComponent(parentEntity, positionId);

  if (!parentPosition) {
    positionComponent.world.x = positionComponent.local.x;
    positionComponent.world.y = positionComponent.local.y;

    return;
  }

  const parentRotation = world.getComponent(parentEntity, rotationId);
  const parentScale = world.getComponent(parentEntity, scaleId);
  const offset = Vec2.clone(positionComponent.local);

  if (parentScale) {
    Vec2.multiplyComponents(offset, parentScale.world);
  }

  if (parentRotation) {
    Vec2.rotate(offset, parentRotation.world);
  }

  positionComponent.world.x = parentPosition.world.x + offset.x;
  positionComponent.world.y = parentPosition.world.y + offset.y;
}

function composeRotationWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
): void {
  const rotationComponent = world.getComponent(entity, rotationId);

  if (!rotationComponent) {
    return;
  }

  const parentRotation = world.getComponent(parentEntity, rotationId);

  rotationComponent.world = parentRotation
    ? parentRotation.world + rotationComponent.local
    : rotationComponent.local;
}

function composeScaleWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
): void {
  const scaleComponent = world.getComponent(entity, scaleId);

  if (!scaleComponent) {
    return;
  }

  const parentScale = world.getComponent(parentEntity, scaleId);

  if (!parentScale) {
    scaleComponent.world.x = scaleComponent.local.x;
    scaleComponent.world.y = scaleComponent.local.y;

    return;
  }

  scaleComponent.world.x = parentScale.world.x * scaleComponent.local.x;
  scaleComponent.world.y = parentScale.world.y * scaleComponent.local.y;
}

function composeWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
): void {
  composePositionWithParent(entity, parentEntity, world);
  composeRotationWithParent(entity, parentEntity, world);
  composeScaleWithParent(entity, parentEntity, world);
}

function computeWorld(
  entity: number,
  cache: TransformCache,
  frozen: Set<number>,
  world: EcsWorld,
): void {
  // Static entities (and their static ancestors) have their world transform
  // computed once and then skipped on every subsequent frame. Re-check
  // `isStatic` here in case the entity's id was recycled for a new entity.
  if (frozen.has(entity)) {
    const positionComponent = world.getComponent(entity, positionId);

    if (positionComponent?.isStatic) {
      return;
    }

    frozen.delete(entity);
  }

  if (cache.computed.has(entity)) {
    return;
  }

  // Cycle detection: if we re-enter an entity, break the cycle by treating it as a root.
  if (cache.visiting.has(entity)) {
    setLocalAsWorldIfExists(entity, world);
    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const hasPosition = world.getComponent(entity, positionId);
  const hasRotation = world.getComponent(entity, rotationId);
  const hasScale = world.getComponent(entity, scaleId);

  if (!hasPosition && !hasRotation && !hasScale) {
    cache.visiting.delete(entity);

    return;
  }

  const parentComponent = world.getComponent(entity, parentId);

  if (!parentComponent) {
    setLocalAsWorldIfExists(entity, world);
    cache.visiting.delete(entity);
    cache.computed.add(entity);

    if (hasPosition?.isStatic) {
      frozen.add(entity);
    }

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, cache, frozen, world);

  composeWithParent(entity, parentEntity, world);

  cache.visiting.delete(entity);
  cache.computed.add(entity);

  if (hasPosition?.isStatic && frozen.has(parentEntity)) {
    frozen.add(entity);
  }
}

/**
 * Creates a system that computes the world position, rotation and scale of
 * every entity from its local transform and, if it has a `ParentEcsComponent`,
 * its parent's world transform.
 *
 * Entities (and their entire parent chain) with `PositionEcsComponent.isStatic`
 * set to `true` have their world transform computed once and then skipped on
 * every subsequent frame.
 * @returns The transform ECS system.
 */
export const createTransformEcsSystem = (): EcsSystem<
  [PositionEcsComponent]
> => {
  const cache = createTransformCache();

  // Entities whose world transform is static and has already been computed,
  // so `computeWorld` can skip them entirely. Persists across frames.
  const frozen = new Set<number>();

  return {
    query: [positionId],

    update: (world, { entities }) => {
      resetTransformCache(cache);

      for (const entity of entities) {
        computeWorld(entity, cache, frozen, world);
      }
    },
  };
};
