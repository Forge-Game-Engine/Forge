import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world';
import { EcsSystem } from './ecs-system';
import { createComponentId } from './ecs-component';

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();
    const positionId = createComponentId<{ x: number }>('position');
    const rotationId = createComponentId<{ angle: number }>('rotation');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1 = { x: 1 };
    const rot1 = { angle: 10 };
    const pos2 = { x: 2 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);

    const results: Array<{ entity: number; components: unknown[] }> = [];
    const system: EcsSystem<[{ x: number }, { angle: number }]> = {
      query: [positionId, rotationId],
      run: (result) => {
        results.push({
          entity: result.entity,
          components: [...result.components],
        });
      },
    };

    world.addSystem(system);
    world.update();

    expect(results).toHaveLength(1);
    expect(results[0].entity).toBe(entity1);
    expect(results[0].components[0]).toBe(pos1);
    expect(results[0].components[1]).toBe(rot1);
  });

  it('queries single component returns all entities', () => {
    const world = new EcsWorld();
    const tagId = createComponentId<{ value: string }>('tag');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const tag1 = { value: 'a' };
    const tag2 = { value: 'b' };

    world.addComponent(entity1, tagId, tag1);
    world.addComponent(entity2, tagId, tag2);

    const results: Array<{ entity: number; component: { value: string } }> = [];
    const system: EcsSystem<[{ value: string }]> = {
      query: [tagId],
      run: (result) => {
        results.push({
          entity: result.entity,
          component: result.components[0] as { value: string },
        });
      },
    };

    world.addSystem(system);
    world.update();

    expect(results).toHaveLength(2);
    expect(results[0].entity).toBe(entity1);
    expect(results[0].component).toBe(tag1);
    expect(results[1].entity).toBe(entity2);
    expect(results[1].component).toBe(tag2);
  });

  it('skips entities missing some components', () => {
    const world = new EcsWorld();
    const positionId = createComponentId<{ x: number }>('position');
    const velocityId = createComponentId<{ y: number }>('velocity');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const position1 = { x: 1 };
    const position2 = { x: 2 };
    const velocity2 = { y: 3 };

    world.addComponent(entity1, positionId, position1);
    world.addComponent(entity2, positionId, position2);
    world.addComponent(entity2, velocityId, velocity2);

    const results: Array<{ entity: number; components: unknown[] }> = [];
    const system: EcsSystem<[{ x: number }, { y: number }]> = {
      query: [positionId, velocityId],
      run: (result) => {
        results.push({
          entity: result.entity,
          components: [...result.components],
        });
      },
    };

    world.addSystem(system);
    world.update();

    expect(results).toHaveLength(1);
    expect(results[0].entity).toBe(entity2);
    expect(results[0].components[0]).toEqual(position2);
    expect(results[0].components[1]).toEqual(velocity2);
  });

  it('throws when no components found for the given names', () => {
    const world = new EcsWorld();
    const nonexistentId = createComponentId('nonexistent');

    const system: EcsSystem<[]> = {
      query: [nonexistentId],
      run: () => {},
    };

    world.addSystem(system);

    expect(() => world.update()).toThrow(
      'No components found for the given name: Symbol(nonexistent).',
    );
  });

  it('runs systems with query results', () => {
    const world = new EcsWorld();
    const positionId = createComponentId<{ x: number }>('position');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1 = { x: -5 };
    const pos2 = { x: 5 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity2, positionId, pos2);

    const run = vi.fn(
      (result: { entity: number; components: [{ x: number }] }) => {
        const [position] = result.components;

        position.x += 10;
      },
    );

    const system: EcsSystem<[{ x: number }]> = {
      query: [positionId],
      run,
    };

    world.addSystem(system);

    world.update();

    expect(run).toHaveBeenCalledTimes(2);
    expect(pos1.x).toBe(5);
    expect(pos2.x).toBe(15);
  });

  it('invokes multiple systems independently', () => {
    const world = new EcsWorld();
    const positionId = createComponentId<{ x: number }>('position');
    const rotationId = createComponentId<{ radians: number }>('rotation');

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1 = { x: -5 };
    const rot1 = { radians: 1 };
    const pos2 = { x: 5 };
    const rot2 = { radians: 2 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);
    world.addComponent(entity2, rotationId, rot2);

    const positionSystem: EcsSystem<[{ x: number }]> = {
      query: [positionId],
      run: vi.fn((result: { entity: number; components: [{ x: number }] }) => {
        const [position] = result.components;

        position.x += 10;
      }),
    };

    const rotationSystem: EcsSystem<[{ radians: number }]> = {
      query: [rotationId],
      run: vi.fn(
        (result: { entity: number; components: [{ radians: number }] }) => {
          const [rotation] = result.components;

          rotation.radians *= 2;
        },
      ),
    };

    world.addSystem(positionSystem);
    world.addSystem(rotationSystem);

    world.update();

    expect(positionSystem.run).toHaveBeenCalledTimes(2);
    expect(pos1.x).toBe(5);
    expect(pos2.x).toBe(15);

    expect(rotationSystem.run).toHaveBeenCalledTimes(2);
    expect(rot1.radians).toBe(2);
    expect(rot2.radians).toBe(4);
  });
});
