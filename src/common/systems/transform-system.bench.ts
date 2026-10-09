import { bench, describe } from 'vitest';
import { EcsWorld, QueryResult } from '../../ecs/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
  positionId,
} from '../components/index.js';
import { createTransformEcsSystem } from './transform-system.js';

const entityCounts = [1_000, 10_000, 100_000];

// Each chain of the deep hierarchy is this many entities, root included.
const chainDepth = 32;

/** Adds an entity with a position, rotation and scale. */
function addTransformEntity(world: EcsWorld, index: number): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: { x: index % 7, y: 1 } });
  addRotationComponent(world, entity, { local: 0.01 * (index % 13) });
  addScaleComponent(world, entity, { local: { x: 1.01, y: 0.99 } });

  return entity;
}

/** Builds `count` root entities with no parents. */
function createFlatWorld(count: number): EcsWorld {
  const world = new EcsWorld();

  for (let i = 0; i < count; i++) {
    addTransformEntity(world, i);
  }

  return world;
}

/**
 * Builds `count` entities in chains of {@link chainDepth}, each entity the
 * parent of the next.
 */
function createDeepWorld(count: number): EcsWorld {
  const world = new EcsWorld();
  let parent: number | null = null;

  for (let i = 0; i < count; i++) {
    const entity = addTransformEntity(world, i);

    if (i % chainDepth !== 0 && parent !== null) {
      world.setParent(entity, parent);
    }

    parent = entity;
  }

  return world;
}

const hierarchies = [
  { name: 'flat', createWorld: createFlatWorld },
  { name: `chains of ${chainDepth}`, createWorld: createDeepWorld },
];

for (const { name, createWorld } of hierarchies) {
  describe(`transform system, ${name}`, () => {
    for (const count of entityCounts) {
      const world = createWorld(count);
      const system = createTransformEcsSystem();
      const queryResult: QueryResult<[PositionEcsComponent]> = world.query([
        positionId,
      ]);

      bench(`${count.toLocaleString('en-US')} entities`, () => {
        system.update(world, queryResult);
      });
    }
  });
}
