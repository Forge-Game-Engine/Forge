import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from './ecs-world';
import { EcsSystem } from './ecs-system';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  SpeedEcsComponent,
  speedId,
} from '../common/index.js';
import { createComponentId } from './ecs-component';
import { Vector2 } from '../math/index.js';

describe('EcsWorld', () => {
  it('queries entities with multiple components', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(1, 0),
      world: new Vector2(1, 0),
    };
    const rot1: RotationEcsComponent = { local: 10, world: 10 };
    const pos2: PositionEcsComponent = {
      local: new Vector2(2, 0),
      world: new Vector2(2, 0),
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);

    const run = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, RotationEcsComponent]> = {
      query: [positionId, rotationId],
      run,
    };

    world.addSystem(system);
    world.update();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: entity1,
        components: [pos1, rot1],
      }),
      world,
      undefined,
    );
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

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const position1: PositionEcsComponent = {
      local: new Vector2(1, 0),
      world: new Vector2(1, 0),
    };
    const position2: PositionEcsComponent = {
      local: new Vector2(2, 0),
      world: new Vector2(2, 0),
    };
    const speed2: SpeedEcsComponent = { speed: 3 };

    world.addComponent(entity1, positionId, position1);
    world.addComponent(entity2, positionId, position2);
    world.addComponent(entity2, speedId, speed2);

    const run = vi.fn();
    const system: EcsSystem<[PositionEcsComponent, SpeedEcsComponent]> = {
      query: [positionId, speedId],
      run,
    };

    world.addSystem(system);
    world.update();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: entity2,
        components: [position2, speed2],
      }),
      world,
      undefined,
    );
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

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(-5, 0),
      world: new Vector2(-5, 0),
    };
    const pos2: PositionEcsComponent = {
      local: new Vector2(5, 0),
      world: new Vector2(5, 0),
    };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity2, positionId, pos2);

    const run = vi.fn(
      (result: { entity: number; components: [PositionEcsComponent] }) => {
        const [position] = result.components;

        position.local.x += 10;
      },
    );

    const system: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      run,
    };

    world.addSystem(system);

    world.update();

    expect(run).toHaveBeenCalledTimes(2);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);
  });

  it('invokes multiple systems independently', () => {
    const world = new EcsWorld();

    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const pos1: PositionEcsComponent = {
      local: new Vector2(-5, 0),
      world: new Vector2(-5, 0),
    };
    const rot1: RotationEcsComponent = { local: 1, world: 1 };
    const pos2: PositionEcsComponent = {
      local: new Vector2(5, 0),
      world: new Vector2(5, 0),
    };
    const rot2: RotationEcsComponent = { local: 2, world: 2 };

    world.addComponent(entity1, positionId, pos1);
    world.addComponent(entity1, rotationId, rot1);
    world.addComponent(entity2, positionId, pos2);
    world.addComponent(entity2, rotationId, rot2);

    const positionSystem: EcsSystem<[PositionEcsComponent]> = {
      query: [positionId],
      run: vi.fn(
        (result: { entity: number; components: [PositionEcsComponent] }) => {
          const [position] = result.components;

          position.local.x += 10;
        },
      ),
    };

    const rotationSystem: EcsSystem<[RotationEcsComponent]> = {
      query: [rotationId],
      run: vi.fn(
        (result: { entity: number; components: [RotationEcsComponent] }) => {
          const [rotation] = result.components;

          rotation.local *= 2;
        },
      ),
    };

    world.addSystem(positionSystem);
    world.addSystem(rotationSystem);

    world.update();

    expect(positionSystem.run).toHaveBeenCalledTimes(2);
    expect(pos1.local.x).toBe(5);
    expect(pos2.local.x).toBe(15);

    expect(rotationSystem.run).toHaveBeenCalledTimes(2);
    expect(rot1.local).toBe(2);
    expect(rot2.local).toBe(4);
  });
});
