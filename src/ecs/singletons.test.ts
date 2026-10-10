import { beforeEach, describe, expect, it } from 'vitest';
import { createComponentId } from './ecs-component.js';
import { EcsWorld } from './ecs-world.js';

interface Settings {
  volume: number;
}

const settingsId = createComponentId<Settings>('settings');

describe('singleton components', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  it('adds the component to a new entity and returns it', () => {
    const settings = world.addSingleton(settingsId, { volume: 1 });

    expect(world.getSingleton(settingsId)).toBe(settings);
    expect(world.query([settingsId]).entities).toHaveLength(1);
  });

  it('throws when an entity already has the component', () => {
    world.addSingleton(settingsId, { volume: 1 });

    expect(() => world.addSingleton(settingsId, { volume: 2 })).toThrow(
      /already has one/,
    );
  });

  it('throws when adding a singleton an ordinary entity already has', () => {
    world.addComponent(world.createEntity(), settingsId, { volume: 1 });

    expect(() => world.addSingleton(settingsId, { volume: 2 })).toThrow(
      /already has one/,
    );
  });

  it('throws when getting a singleton no entity has', () => {
    expect(() => world.getSingleton(settingsId)).toThrow(/no entity has one/);
  });

  it('throws when getting a singleton two entities have', () => {
    world.addComponent(world.createEntity(), settingsId, { volume: 1 });
    world.addComponent(world.createEntity(), settingsId, { volume: 2 });

    expect(() => world.getSingleton(settingsId)).toThrow(/2 entities/);
    expect(() => world.tryGetSingleton(settingsId)).toThrow(/2 entities/);
  });

  it('returns null from tryGetSingleton when no entity has it', () => {
    expect(world.tryGetSingleton(settingsId)).toBeNull();
  });

  it('is removed with its entity, like any other component', () => {
    world.addSingleton(settingsId, { volume: 1 });

    const [entity] = world.query([settingsId]).entities;

    world.removeEntity(entity);

    expect(world.tryGetSingleton(settingsId)).toBeNull();
    expect(() => world.addSingleton(settingsId, { volume: 2 })).not.toThrow();
  });

  it('is matched by declared queries', () => {
    const seen: Settings[] = [];
    const settings = world.addSingleton(settingsId, { volume: 1 });

    world.addSystem<[Settings]>({
      query: [settingsId],
      update: (_world, { components: [values] }) => seen.push(...values),
    });
    world.update();

    expect(seen).toEqual([settings]);
  });
});
