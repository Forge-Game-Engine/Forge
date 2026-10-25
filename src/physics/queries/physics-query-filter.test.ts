import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { createBroadPhase } from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import {
  defaultPhysicsQueryFilter,
  readQueryCandidate,
} from './physics-query-filter.js';

describe('readQueryCandidate', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    createBroadPhase(world);
    world.addSystem(createBroadPhaseEcsSystem([]));
  });

  function read(entity: number, filter = defaultPhysicsQueryFilter) {
    return readQueryCandidate(
      entity,
      world.getComponentAccessor<ColliderEcsComponent>(colliderId),
      world.getComponentAccessor<PositionEcsComponent>(positionId),
      filter,
    );
  }

  function addCollider(
    options: { category?: number; sensor?: boolean } = {},
  ): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(1),
      ...options,
    });
    // The broad phase writes the collider's bounds.
    world.update();

    return entity;
  }

  it('reads the collider and position of an entity the filter lets through', () => {
    const entity = addCollider();
    const candidate = read(entity);

    expect(candidate?.collider).toBe(
      world.getComponent<ColliderEcsComponent>(entity, colliderId),
    );
    expect(candidate?.position).toBe(
      world.getComponent<PositionEcsComponent>(entity, positionId),
    );
  });

  it('skips a collider whose category is not in the mask', () => {
    const entity = addCollider({ category: 0b10 });

    expect(read(entity, { mask: 0b01, includeSensors: false })).toBeNull();
    expect(read(entity, { mask: 0b11, includeSensors: false })).not.toBeNull();
  });

  it('skips a sensor unless the filter includes sensors', () => {
    const entity = addCollider({ sensor: true });

    expect(read(entity)).toBeNull();
    expect(
      read(entity, { ...defaultPhysicsQueryFilter, includeSensors: true }),
    ).not.toBeNull();
  });

  it('skips an entity removed since the broad phase ran', () => {
    const entity = addCollider();

    world.removeEntity(entity);

    expect(read(entity)).toBeNull();
  });

  it('skips an entity that lost its position', () => {
    const entity = addCollider();

    world.removeComponent(entity, positionId);

    expect(read(entity)).toBeNull();
  });

  it('skips a collider whose bounds are still the empty box it starts with', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    expect(read(entity)).toBeNull();
  });
});
