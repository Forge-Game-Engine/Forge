import { ComponentKey, createComponentId } from '../ecs-component.js';
import { EcsSystem } from '../ecs-system.js';
import { EcsWorld } from '../ecs-world.js';

/** The component every benchmark scene's components share. */
export interface BenchValue {
  value: number;
}

const componentTypeCount = 8;

/**
 * A world filled for the ECS benchmarks: entities with overlapping sets of
 * components, and systems with overlapping declarations over them.
 */
export interface EcsBenchScene {
  /** The world. */
  readonly world: EcsWorld;

  /** A sum every system adds to, so their work can't be optimized away. */
  readonly checksum: number;

  /**
   * Replaces `count` entities, the least recently created first, with new
   * entities that have the same components. The component objects are
   * reused, so the work and any allocation measured are the world's own.
   * @param count - How many entities to replace.
   */
  replaceEntities(count: number): void;
}

// Whether the entity created `index`-th has component type `type`. Every
// entity has at least one component, and roughly half have each type, so
// declarations over two or three types overlap.
const hasComponent = (index: number, type: number): boolean =>
  type === index % componentTypeCount ||
  ((index * 2654435761) >>> (type * 3)) % 2 === 0;

/**
 * Builds a benchmark scene.
 * @param entityCount - How many entities to create.
 * @param systemCount - How many systems to register.
 * @returns The scene.
 */
export const createEcsBenchScene = (
  entityCount: number,
  systemCount: number,
): EcsBenchScene => {
  const world = new EcsWorld();
  const keys: ComponentKey<BenchValue>[] = [];

  for (let type = 0; type < componentTypeCount; type++) {
    keys.push(createComponentId<BenchValue>(`bench-${type}`));
  }

  // One object per entity and type, reused by the entity that replaces it.
  const values: BenchValue[][] = keys.map(() =>
    Array.from({ length: entityCount }, () => ({ value: 1 })),
  );

  // Summed by every system, so their loops can't be optimized away.
  let checksum = 0;

  // The entity created from each pattern, in creation order, as a ring.
  const entities: number[] = [];
  let oldest = 0;

  const create = (pattern: number): number => {
    const entity = world.createEntity();

    for (let type = 0; type < componentTypeCount; type++) {
      if (hasComponent(pattern, type)) {
        world.addComponent(entity, keys[type], values[type][pattern]);
      }
    }

    return entity;
  };

  for (let pattern = 0; pattern < entityCount; pattern++) {
    entities.push(create(pattern));
  }

  for (let s = 0; s < systemCount; s++) {
    const first = keys[s % componentTypeCount];
    const second = keys[(s + 1 + (s >> 3)) % componentTypeCount];
    const excluded = keys[(s + 3) % componentTypeCount];

    const system: EcsSystem<[BenchValue, BenchValue]> = {
      name: `bench-${s}`,
      query: [first, second],
      without: s % 2 === 0 ? [excluded] : undefined,
      // Reads `components` by index: destructuring it would allocate an
      // iterator wherever V8 doesn't optimize it away, which would be
      // measured as the world's.
      update: (_world, { components, added, removed }) => {
        const firsts = components[0];
        const seconds = components[1];

        let sum = added.length - removed.length;

        for (let i = 0; i < firsts.length; i++) {
          sum += firsts[i].value * seconds[i].value;
        }

        checksum += sum;
      },
    };

    world.addSystem(system);
  }

  return {
    world,
    get checksum(): number {
      return checksum;
    },
    replaceEntities: (count: number): void => {
      for (let i = 0; i < count; i++) {
        const pattern = oldest;

        world.removeEntity(entities[pattern]);
        entities[pattern] = create(pattern);
        oldest = (oldest + 1) % entityCount;
      }
    },
  };
};
