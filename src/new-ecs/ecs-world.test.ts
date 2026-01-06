import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world';
import { EcsSystem } from './ecs-system';

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();
    const pos1 = { name: 'position', x: 1 };
    const rot1 = { name: 'rotation', angle: 10 };
    const pos2 = { name: 'position', x: 2 };

    world.addComponent(1, pos1);
    world.addComponent(1, rot1);
    world.addComponent(2, pos2);
    const results = Array.from(world.query(['position', 'rotation']));

    expect(results).toHaveLength(1);
    expect(results[0][0]).toBe(1);
    expect(results[0][1]).toBe(pos1);
    expect(results[0][2]).toBe(rot1);
  });

  it('queries single component returns all entities', () => {
    const world = new EcsWorld();

    const tag1 = { name: 'tag', value: 'a' };
    const tag2 = { name: 'tag', value: 'b' };

    world.addComponent(1, tag1);
    world.addComponent(2, tag2);

    const iterator = world.query<[{ name: string; value: string }]>(['tag']);

    const result1 = iterator.next().value as [
      number,
      { name: string; value: string },
    ];
    expect(result1[0]).toBe(1);
    expect(result1[1]).toBe(tag1);

    const result2 = iterator.next().value as [
      number,
      { name: string; value: string },
    ];
    expect(result2[0]).toBe(2);
    expect(result2[1]).toBe(tag2);
  });

  it('skips entities missing some components', () => {
    const world = new EcsWorld();

    const position1 = { name: 'position', x: 1 };
    const position2 = { name: 'position', x: 2 };
    const velocity2 = { name: 'velocity', y: 3 };

    world.addComponent(1, position1);
    world.addComponent(2, position2);
    world.addComponent(2, velocity2);

    const results = Array.from(world.query(['position', 'velocity']));

    expect(results).toHaveLength(1);
    expect(results[0][0]).toBe(2);
    expect(results[0][1]).toEqual(position2);
    expect(results[0][2]).toEqual(velocity2);
  });

  it('throws when no components found for the given names', () => {
    const world = new EcsWorld();

    expect(() => Array.from(world.query(['nonexistent']))).toThrow(
      'No components found for the given name: nonexistent.',
    );
  });

  it('runs systems with query results', () => {
    const world = new EcsWorld();
    const pos1 = { name: 'position', x: -5 };
    const pos2 = { name: 'position', x: 5 };

    world.addComponent(1, pos1);
    world.addComponent(2, pos2);

    const run = vi.fn((components: [number, { x: number }]) => {
      const [, position] = components;

      position.x += 10;
    });

    const system: EcsSystem<[{ x: number }]> = {
      query: ['position'],
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
    const pos1 = { name: 'position', x: -5 };
    const rot1 = { name: 'rotation', radians: 1 };
    const pos2 = { name: 'position', x: 5 };
    const rot2 = { name: 'rotation', radians: 2 };

    world.addComponent(1, pos1);
    world.addComponent(1, rot1);
    world.addComponent(2, pos2);
    world.addComponent(2, rot2);

    const positionSystem: EcsSystem<[{ x: number }]> = {
      query: ['position'],
      run: vi.fn((components: [number, { x: number }]) => {
        const [, position] = components;

        position.x += 10;
      }),
    };

    const rotationSystem: EcsSystem<[{ radians: number }]> = {
      query: ['rotation'],
      run: vi.fn((components: [number, { radians: number }]) => {
        const [, rotation] = components;

        rotation.radians *= 2;
      }),
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
