import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParentEcsComponent, parentId } from '../../ecs/hierarchy.js';
import { Vec2 } from '../../math/index.js';
import {
  PositionEcsComponent,
  positionId,
  rotationId,
  scaleId,
} from '../components/index.js';

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
    scaleComponent.world.x = scaleComponent.local.x;
    scaleComponent.world.y = scaleComponent.local.y;
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

// The parent component a static entity was frozen under, keyed by its
// position component. `setParent` and `removeParent` replace or remove the
// parent component, so a frozen entity whose stored one no longer matches
// has been reparented and is recomputed.
type FrozenTransforms = WeakMap<
  PositionEcsComponent,
  ParentEcsComponent | null
>;

function computeWorld(
  entity: number,
  computed: Set<number>,
  frozen: FrozenTransforms,
  world: EcsWorld,
): void {
  const positionComponent = world.getComponent(entity, positionId);
  const parentComponent = world.getComponent(entity, parentId);

  // Static entities (and their static ancestors) have their world transform
  // computed once and then skipped on every subsequent frame. Re-checking
  // `isStatic` and the parent unfreezes an entity whose `isStatic` has been
  // cleared or that has been reparented.
  if (positionComponent && frozen.has(positionComponent)) {
    if (
      positionComponent.isStatic &&
      frozen.get(positionComponent) === parentComponent
    ) {
      return;
    }

    frozen.delete(positionComponent);
  }

  if (computed.has(entity)) {
    return;
  }

  const hasRotation = world.getComponent(entity, rotationId);
  const hasScale = world.getComponent(entity, scaleId);

  if (!positionComponent && !hasRotation && !hasScale) {
    return;
  }

  if (!parentComponent) {
    setLocalAsWorldIfExists(entity, world);
    computed.add(entity);

    if (positionComponent?.isStatic) {
      frozen.set(positionComponent, null);
    }

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, computed, frozen, world);

  composeWithParent(entity, parentEntity, world);

  computed.add(entity);

  const parentPosition = world.getComponent(parentEntity, positionId);

  if (
    positionComponent?.isStatic &&
    parentPosition &&
    frozen.has(parentPosition)
  ) {
    frozen.set(positionComponent, parentComponent);
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
  const computed = new Set<number>();

  // The position components of entities whose world transform is static and
  // has already been computed, so `computeWorld` can skip them entirely.
  // Persists across frames. Keyed by component rather than entity, so
  // removing the entity (or its position) drops it from the map, and a
  // position added later starts unfrozen.
  const frozen: FrozenTransforms = new WeakMap();

  return {
    query: [positionId],

    update: (world, { entities }) => {
      computed.clear();

      for (const entity of entities) {
        computeWorld(entity, computed, frozen, world);
      }
    },
  };
};
