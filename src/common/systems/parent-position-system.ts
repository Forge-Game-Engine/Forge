import { EcsSystem } from '../../new-ecs/ecs-system';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import { PositionEcsComponent, positionId } from '../components';
import { parentId } from '../components/parent-component';
import { createTransformCache, resetTransformCache } from './transform-cache';

const cache = createTransformCache();

function computeWorld(entity: number, world: EcsWorld): void {
  if (cache.computed.has(entity)) {
    return;
  }

  // Cycle detection: if we re-enter an entity, break the cycle by treating it as a root.
  if (cache.visiting.has(entity)) {
    const positionComponent = world.getComponent(entity, positionId);

    if (positionComponent) {
      positionComponent.world.x = positionComponent.local.x;
      positionComponent.world.y = positionComponent.local.y;
    }

    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const positionComponent = world.getComponent(entity, positionId);

  if (!positionComponent) {
    cache.visiting.delete(entity);

    return;
  }

  const parentComponent = world.getComponent(entity, parentId);

  if (!parentComponent) {
    if (positionComponent) {
      positionComponent.world.x = positionComponent.local.x;
      positionComponent.world.y = positionComponent.local.y;
    }

    cache.visiting.delete(entity);
    cache.computed.add(entity);

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, world);

  const parentPosition = world.getComponent(parentEntity, positionId);

  if (positionComponent) {
    if (parentPosition) {
      positionComponent.world.x =
        parentPosition.world.x + positionComponent.local.x;
      positionComponent.world.y =
        parentPosition.world.y + positionComponent.local.y;
    } else {
      positionComponent.world.x = positionComponent.local.x;
      positionComponent.world.y = positionComponent.local.y;
    }
  }

  cache.visiting.delete(entity);
  cache.computed.add(entity);
}

type TransformSystem = EcsSystem<[PositionEcsComponent], void> & {
  beforeQuery: (world: EcsWorld) => void;
};

export const createParentPositionEcsSystem = (): TransformSystem => ({
  query: [positionId],
  beforeQuery: () => resetTransformCache(cache),
  run: (result, world) => {
    const entity = result.entity;

    computeWorld(entity, world);
  },
});
