import { beforeEach, describe, expect, it } from 'vitest';
import { createRemoveFromWorldEcsSystem } from './remove-from-world-lifecycle-system';
import {
  addLifetimeComponent,
  lifetimeId,
} from '../components/lifetime-component';
import { RemoveFromWorldLifetimeStrategyId } from '../strategies/remove-from-world-strategy-component';
import { Time } from '../../common';
import { EcsWorld } from '../../ecs';

describe('RemoveFromWorldLifecycleSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createRemoveFromWorldEcsSystem());
  });

  it('should not remove entity when hasExpired is false', () => {
    // Arrange
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      durationSeconds: 5,
    });

    world.addTag(entity, RemoveFromWorldLifetimeStrategyId);

    world.update();

    const entitiesMatchingQuery: number[] = [];

    world.queryEntities(
      [lifetimeId, RemoveFromWorldLifetimeStrategyId],
      entitiesMatchingQuery,
    );

    // Assert
    expect(entitiesMatchingQuery).toHaveLength(1);
  });

  it('should remove entity when hasExpired is true', () => {
    // Arrange
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, {
      durationSeconds: 5,
      hasExpired: true,
    });

    world.addTag(entity, RemoveFromWorldLifetimeStrategyId);

    world.update();

    const entitiesMatchingQuery: number[] = [];

    world.queryEntities(
      [lifetimeId, RemoveFromWorldLifetimeStrategyId],
      entitiesMatchingQuery,
    );

    // Assert
    expect(entitiesMatchingQuery).toHaveLength(0);
  });

  it('should only process entities with both LifetimeComponent and RemoveFromWorldStrategyComponent', () => {
    // Arrange
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    addLifetimeComponent(world, entity1, {
      durationSeconds: 5,
      hasExpired: true,
    });

    world.addTag(entity1, RemoveFromWorldLifetimeStrategyId);
    world.addTag(entity2, RemoveFromWorldLifetimeStrategyId);

    // Act
    time.update(0.1);
    world.update();

    const entitiesMatchingQuery: number[] = [];

    world.queryEntities(
      [RemoveFromWorldLifetimeStrategyId],
      entitiesMatchingQuery,
    );

    // Assert
    expect(entitiesMatchingQuery).toHaveLength(1);
  });
});
