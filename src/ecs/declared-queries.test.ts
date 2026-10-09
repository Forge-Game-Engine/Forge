import { describe, expect, it } from 'vitest';
import { createComponentId, createTagId } from './ecs-component.js';
import { EcsSystem } from './ecs-system.js';
import { EcsWorld } from './ecs-world.js';
import { parentId } from './hierarchy.js';
import { QueryDeclaration, QueryResult } from './query-result.js';

interface Value {
  value: number;
}

const aId = createComponentId<Value>('a');
const bId = createComponentId<Value>('b');
const cId = createComponentId<Value>('c');
const tagX = createTagId('x');
const tagY = createTagId('y');
const componentKeys = [aId, bId, cId];
const tagKeys = [tagX, tagY];

/** A small seeded generator, so a failing sequence can be replayed. */
const createRandom = (seed: number): ((max: number) => number) => {
  let state = seed >>> 0;

  return (max: number): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * max;
  };
};

/** What a brute-force scan of the world finds for a declaration. */
const scan = (
  world: EcsWorld,
  alive: readonly number[],
  declaration: QueryDeclaration<readonly unknown[]>,
): Map<number, unknown[]> => {
  const matches = new Map<number, unknown[]>();

  for (const entity of alive) {
    const required = [...declaration.query, ...(declaration.tags ?? [])];
    const has = (key: symbol): boolean =>
      world.getComponent(entity, key) !== null;

    if (
      required.length > 0 &&
      required.every(has) &&
      !(declaration.without ?? []).some(has)
    ) {
      matches.set(
        entity,
        declaration.query.map((key) => world.getComponent(entity, key)),
      );
    }
  }

  return matches;
};

/** A system's view of one declaration, rebuilt from its journals alone. */
interface JournalView {
  members: Set<number>;
}

const declarations: Record<string, QueryDeclaration<readonly unknown[]>> = {
  a: { query: [aId] },
  ab: { query: [aId, bId] },
  ba: { query: [bId, aId] },
  aWithoutB: { query: [aId], without: [bId] },
  cTaggedX: { query: [cId], tags: [tagX] },
  aWithoutTagY: { query: [aId], without: [tagY] },
  parented: { query: [parentId, bId] },
  tagOnly: { query: [], tags: [tagY] },
};

const createRecordingSystem = (
  declaration: QueryDeclaration<readonly unknown[]>,
  onUpdate: (
    result: QueryResult<readonly unknown[]>,
    secondary: QueryResult<readonly unknown[]>,
  ) => void,
): EcsSystem<readonly unknown[], { mirror: readonly unknown[] }> => ({
  ...declaration,
  queries: { mirror: declaration },
  update: (_world, result, { mirror }) => onUpdate(result, mirror),
});

const expectMatchesScan = (
  world: EcsWorld,
  alive: readonly number[],
  declaration: QueryDeclaration<readonly unknown[]>,
  result: QueryResult<readonly unknown[]>,
  view: JournalView,
): void => {
  const expected = scan(world, alive, declaration);

  expect(new Set(result.entities)).toEqual(new Set(expected.keys()));
  expect(result.entities).toHaveLength(expected.size);

  result.entities.forEach((entity, i) => {
    const components = result.components as unknown[][];

    expect(components.map((column) => column[i])).toEqual(expected.get(entity));

    components.forEach((column, k) => {
      expect(column[i]).toBe(expected.get(entity)?.[k]);
    });
  });

  expect(new Set(result.added).size).toBe(result.added.length);
  expect(new Set(result.removed).size).toBe(result.removed.length);

  for (const entity of result.removed) {
    expect(view.members.has(entity)).toBe(true);
    view.members.delete(entity);
  }

  for (const entity of result.added) {
    expect(view.members.has(entity)).toBe(false);
    view.members.add(entity);
  }

  expect(view.members).toEqual(new Set(expected.keys()));
};

describe('declared queries', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'equal a brute-force scan after random structural changes (seed %i)',
    (seed) => {
      const random = createRandom(seed);
      const pick = <T>(items: readonly T[]): T =>
        items[Math.floor(random(items.length))];
      const world = new EcsWorld();
      const alive: number[] = [];
      const checks: (() => void)[] = [];
      const pendingChecks: (() => void)[] = [];

      for (const declaration of Object.values(declarations)) {
        const primaryView: JournalView = { members: new Set() };
        const mirrorView: JournalView = { members: new Set() };

        // Systems are registered between changes too, so a membership
        // created mid-sequence starts from the right entities.
        pendingChecks.push(() => {
          const system = createRecordingSystem(
            declaration,
            (result, mirror) => {
              checks.push(() => {
                expectMatchesScan(
                  world,
                  alive,
                  declaration,
                  result,
                  primaryView,
                );
                expectMatchesScan(
                  world,
                  alive,
                  declaration,
                  mirror,
                  mirrorView,
                );
              });
            },
          );

          world.addSystem(system, { runIf: () => random(4) >= 1 });
        });
      }

      const operations: (() => void)[] = [
        () => alive.push(world.createEntity()),
        () => {
          if (alive.length > 0) {
            world.addComponent(pick(alive), pick(componentKeys), {
              value: random(100),
            });
          }
        },
        () => {
          // Adding the object an entity already has isn't a change.
          if (alive.length > 0) {
            const entity = pick(alive);
            const key = pick(componentKeys);
            const existing = world.getComponent(entity, key);

            if (existing) {
              world.addComponent(entity, key, existing);
            }
          }
        },
        () => {
          if (alive.length > 0) {
            world.addTag(pick(alive), pick(tagKeys));
          }
        },
        () => {
          if (alive.length > 0) {
            world.removeComponent(pick(alive), pick(tagKeys));
          }
        },
        () => {
          if (alive.length > 0) {
            world.removeComponent(pick(alive), pick(componentKeys));
          }
        },
        () => {
          if (alive.length > 1) {
            const child = pick(alive);
            const parent = pick(alive);

            try {
              world.setParent(child, parent);
            } catch {
              // Parenting to itself or a descendant throws; skip it.
            }
          }
        },
        () => {
          if (alive.length > 0) {
            world.removeParent(pick(alive));
          }
        },
        () => {
          if (alive.length > 0 && random(3) < 1) {
            world.removeEntity(pick(alive));

            for (let i = alive.length - 1; i >= 0; i--) {
              if (!world.isAlive(alive[i])) {
                alive.splice(i, 1);
              }
            }
          }
        },
      ];

      for (let step = 0; step < 300; step++) {
        const changes = Math.floor(random(12));

        for (let i = 0; i < changes; i++) {
          pick(operations)();
        }

        if (pendingChecks.length > 0 && random(10) < 1) {
          pendingChecks.shift()?.();
        }

        world.update();

        for (const check of checks) {
          check();
        }

        checks.length = 0;
      }
    },
  );

  it('keeps the arrays a system received unchanged while its update changes the world', () => {
    const world = new EcsWorld();
    const first = world.createEntity();

    world.addComponent(first, aId, { value: 1 });

    let seen: number[] = [];

    world.addSystem<[Value], { bs: [Value] }>({
      query: [aId],
      queries: { bs: { query: [bId] } },
      update: (innerWorld, { entities, components: [values] }, { bs }) => {
        const entitiesBefore = [...entities];
        const valuesBefore = [...values];
        const bsBefore = [...bs.entities];
        const added = innerWorld.createEntity();

        innerWorld.addComponent(added, aId, { value: 2 });
        innerWorld.addComponent(added, bId, { value: 2 });
        innerWorld.removeEntity(first);

        expect(entities).toEqual(entitiesBefore);
        expect(values).toEqual(valuesBefore);
        expect(bs.entities).toEqual(bsBefore);

        seen = [...entities];
      },
    });

    world.update();
    expect(seen).toEqual([first]);

    world.update();
    expect(seen).toHaveLength(1);
    expect(seen).not.toContain(first);
  });

  it('runs a system added during a tick from the next tick', () => {
    const world = new EcsWorld();
    const calls: string[] = [];
    const late: EcsSystem<[]> = {
      query: [],
      update: () => calls.push('late'),
    };

    world.addSystem({
      query: [],
      update: (innerWorld) => {
        calls.push('adder');

        if (calls.length === 1) {
          innerWorld.addSystem(late);
        }
      },
    });

    world.update();
    expect(calls).toEqual(['adder']);

    world.update();
    expect(calls).toEqual(['adder', 'adder', 'late']);
  });

  it('still runs a system removed during a tick in that tick, with current results, and not after', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const seen: number[][] = [];
    const removed: EcsSystem<[Value]> = {
      query: [aId],
      update: (_world, { entities }) => seen.push([...entities]),
    };

    world.addSystem({
      query: [],
      update: (innerWorld) => {
        innerWorld.addComponent(entity, aId, { value: 1 });
        innerWorld.removeSystem(removed);
      },
    });
    world.addSystem(removed);

    world.update();
    world.update();

    expect(seen).toEqual([[entity]]);
  });

  it('excludes entities that have a key in `without`', () => {
    const world = new EcsWorld();
    const plain = world.createEntity();
    const excluded = world.createEntity();
    let result: readonly number[] = [];

    world.addComponent(plain, aId, { value: 1 });
    world.addComponent(excluded, aId, { value: 2 });
    world.addTag(excluded, tagX);

    world.addSystem<[Value]>({
      query: [aId],
      without: [tagX],
      update: (_world, { entities }) => {
        result = [...entities];
      },
    });

    world.update();
    expect(result).toEqual([plain]);

    world.removeComponent(excluded, tagX);
    world.addComponent(plain, bId, { value: 3 });
    world.update();
    expect(new Set(result)).toEqual(new Set([plain, excluded]));
  });

  it('matches no entity for a declaration with no component or tag keys', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    let result: readonly number[] | null = null;

    world.addComponent(entity, aId, { value: 1 });
    world.addSystem({
      query: [],
      without: [bId],
      update: (_world, { entities }) => {
        result = entities;
      },
    });

    world.update();
    expect(result).toEqual([]);
  });

  it('shares one membership between systems that declare the same query, and keeps it until the last is removed', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const seenByFirst: number[][] = [];
    const seenBySecond: number[][] = [];
    const first: EcsSystem<[Value, Value]> = {
      query: [aId, bId],
      update: (_world, { entities }) => seenByFirst.push([...entities]),
    };
    const second: EcsSystem<[Value, Value]> = {
      query: [bId, aId],
      update: (_world, { entities }) => seenBySecond.push([...entities]),
    };

    world.addComponent(entity, aId, { value: 1 });
    world.addComponent(entity, bId, { value: 2 });
    world.addSystem(first);
    world.addSystem(second);
    world.update();
    world.removeSystem(first);
    world.removeComponent(entity, bId);
    world.update();
    world.removeSystem(second);
    world.addComponent(entity, bId, { value: 3 });
    world.addSystem(first);
    world.update();

    expect(seenByFirst).toEqual([[entity], [entity]]);
    expect(seenBySecond).toEqual([[entity], []]);
  });

  it('throws when a system is added twice', () => {
    const world = new EcsWorld();
    const system: EcsSystem<[]> = {
      name: 'twice',
      query: [],
      update: () => {},
    };

    world.addSystem(system);

    expect(() => world.addSystem(system)).toThrow(/already registered/);
  });
});
