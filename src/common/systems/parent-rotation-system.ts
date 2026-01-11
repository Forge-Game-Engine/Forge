import { EcsSystem } from '../../new-ecs/ecs-system';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import { RotationEcsComponent, rotationId } from '../components';
import { parentId } from '../components/parent-component';
import { createTransformCache, resetTransformCache } from './transform-cache';

const cache = createTransformCache();

function computeWorld(entity: number, world: EcsWorld): void {
  if (cache.computed.has(entity)) {
    return;
  }

  // Cycle detection: if we re-enter an entity, break the cycle by treating it as a root.
  if (cache.visiting.has(entity)) {
    const rotationComponent = world.getComponent(entity, rotationId);

    if (rotationComponent) {
      rotationComponent.world = rotationComponent.local;
    }

    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const rotationComponent = world.getComponent(entity, rotationId);

  if (!rotationComponent) {
    cache.visiting.delete(entity);

    return;
  }

  const parentComponent = world.getComponent(entity, parentId);

  if (!parentComponent) {
    if (rotationComponent) {
      rotationComponent.world = rotationComponent.local;
    }

    cache.visiting.delete(entity);
    cache.computed.add(entity);

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, world);

  const parentRotation = world.getComponent(parentEntity, rotationId);

  if (rotationComponent) {
    if (parentRotation) {
      rotationComponent.world = parentRotation.world + rotationComponent.local;
    } else {
      rotationComponent.world = rotationComponent.local;
    }
  }

  cache.visiting.delete(entity);
  cache.computed.add(entity);
}

type TransformSystem = EcsSystem<[RotationEcsComponent], void> & {
  beforeQuery: (world: EcsWorld) => void;
};

export const createParentRotationEcsSystem = (): TransformSystem => ({
  query: [rotationId],
  beforeQuery: () => resetTransformCache(cache),
  run: (result, world) => {
    const entity = result.entity;

    computeWorld(entity, world);
  },
});
