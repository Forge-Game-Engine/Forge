import { EcsSystem } from '../../new-ecs/ecs-system';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import {
  PositionEcsComponent,
  positionId,
  rotationId,
  scaleId,
} from '../components';
import { parentId } from '../components/parent-component';

type TransformCache = {
  computed: Set<number>;
  visiting: Set<number>;
};

function computeWorld(
  entity: number,
  cache: TransformCache,
  world: EcsWorld,
): void {
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

    const rotationComponent = world.getComponent(entity, rotationId);

    if (rotationComponent) {
      rotationComponent.world = rotationComponent.local;
    }

    const scaleComponent = world.getComponent(entity, scaleId);

    if (scaleComponent) {
      scaleComponent.world = scaleComponent.local;
    }

    cache.computed.add(entity);

    return;
  }

  cache.visiting.add(entity);

  const positionComponent = world.getComponent(entity, positionId);
  const rotationComponent = world.getComponent(entity, rotationId);
  const scaleComponent = world.getComponent(entity, scaleId);

  if (!positionComponent && !rotationComponent && !scaleComponent) {
    cache.visiting.delete(entity);

    return;
  }

  const parentComponent = world.getComponent(entity, parentId);

  if (!parentComponent) {
    if (positionComponent) {
      positionComponent.world.x = positionComponent.local.x;
      positionComponent.world.y = positionComponent.local.y;
    }

    if (rotationComponent) {
      rotationComponent.world = rotationComponent.local;
    }

    if (scaleComponent) {
      scaleComponent.world = scaleComponent.local;
    }

    cache.visiting.delete(entity);
    cache.computed.add(entity);

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, cache, world);

  const parentPosition = world.getComponent(parentEntity, positionId);
  const parentRotation = world.getComponent(parentEntity, rotationId);
  const parentScale = world.getComponent(parentEntity, scaleId);

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

  if (rotationComponent) {
    if (parentRotation) {
      rotationComponent.world = parentRotation.world + rotationComponent.local;
    } else {
      rotationComponent.world = rotationComponent.local;
    }
  }

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

type TransformSystem = EcsSystem<[PositionEcsComponent], TransformCache> & {
  beforeQuery: (world: EcsWorld) => TransformCache;
};

export const createTransformEcsSystem = (): TransformSystem => ({
  query: [positionId],

  beforeQuery: () => ({
    computed: new Set<number>(),
    visiting: new Set<number>(),
  }),

  run: (result, world, cache) => {
    const entity = result.entity;

    computeWorld(entity, cache, world);
  },
});
