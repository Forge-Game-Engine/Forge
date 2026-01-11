import { EcsSystem } from '../../new-ecs/ecs-system';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import { ScaleEcsComponent, scaleId } from '../components';
import { parentId } from '../components/parent-component';
import { createTransformCache, resetTransformCache } from './transform-cache';

const cache = createTransformCache();

function computeWorld(entity: number, world: EcsWorld): void {
  if (cache.computed.has(entity)) {
    return;
  }

  // Cycle detection: if we re-enter an entity, break the cycle by treating it as a root.
  if (cache.visiting.has(entity)) {
    const scaleComponent = world.getComponent(entity, scaleId);

    if (scaleComponent) {
      scaleComponent.world.x = scaleComponent.local.x;
      scaleComponent.world.y = scaleComponent.local.y;
    }

    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const scaleComponent = world.getComponent(entity, scaleId);

  if (!scaleComponent) {
    cache.visiting.delete(entity);

    return;
  }

  const parentComponent = world.getComponent(entity, parentId);

  if (!parentComponent) {
    if (scaleComponent) {
      scaleComponent.world.x = scaleComponent.local.x;
      scaleComponent.world.y = scaleComponent.local.y;
    }

    cache.visiting.delete(entity);
    cache.computed.add(entity);

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, world);

  const parentScale = world.getComponent(parentEntity, scaleId);

  if (scaleComponent) {
    if (parentScale) {
      scaleComponent.world.x = parentScale.world.x * scaleComponent.local.x;
      scaleComponent.world.y = parentScale.world.y * scaleComponent.local.y;
    } else {
      scaleComponent.world.x = scaleComponent.local.x;
      scaleComponent.world.y = scaleComponent.local.y;
    }
  }

  cache.visiting.delete(entity);
  cache.computed.add(entity);
}

type TransformSystem = EcsSystem<[ScaleEcsComponent], void> & {
  beforeQuery: (world: EcsWorld) => void;
};

export const createParentScaleEcsSystem = (): TransformSystem => ({
  query: [scaleId],
  beforeQuery: () => resetTransformCache(cache),
  run: (result, world) => {
    const entity = result.entity;

    computeWorld(entity, world);
  },
});
