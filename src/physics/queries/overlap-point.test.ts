import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { createBroadPhase } from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import { overlapPoint } from './overlap-point.js';
import { queryAabb } from './query-aabb.js';

const byEntity = (a: number, b: number): number => a - b;

describe('overlapPoint', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    createBroadPhase(world);
    world.addSystem(createBroadPhaseEcsSystem([]));
  });

  function addEntity(
    position: Vector2,
    collider: Collider,
    options: { category?: number; sensor?: boolean; rotation?: number } = {},
  ): number {
    const { rotation, ...colliderOptions } = options;
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity, { local: rotation });
    addColliderComponent(world, entity, { collider, ...colliderOptions });

    return entity;
  }

  it('finds the colliders whose shape contains the point', () => {
    const circle = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    const box = addEntity(
      { x: 1, y: 0 },
      new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]),
    );
    addEntity({ x: 10, y: 0 }, new CircleCollider(1));
    world.update();

    expect(overlapPoint(world, { x: 0.5, y: 0 }).sort(byEntity)).toEqual(
      [circle, box].sort(byEntity),
    );
    expect(overlapPoint(world, { x: 1.5, y: 0 })).toEqual([box]);
  });

  it('rejects a point inside the bounds but outside the shape, which queryAabb finds', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    const corner = { x: 0.9, y: 0.9 };

    expect(queryAabb(world, { min: corner, max: corner })).toEqual([entity]);
    expect(overlapPoint(world, corner)).toEqual([]);
  });

  it('tests a rotated collider in its current pose', () => {
    const bar = addEntity(
      { x: 0, y: 0 },
      new PolygonCollider([
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ]),
      { rotation: Math.PI / 2 },
    );
    world.update();

    expect(overlapPoint(world, { x: 0, y: 2.5 })).toEqual([bar]);
    expect(overlapPoint(world, { x: 2.5, y: 0 })).toEqual([]);
  });

  it('treats an entity with no rotation component as unrotated', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 5, y: 5 } });
    addColliderComponent(world, entity, {
      collider: new CircleCollider(1, 1, { x: 2, y: 0 }),
    });
    world.update();

    expect(overlapPoint(world, { x: 7, y: 5 })).toEqual([entity]);
    expect(overlapPoint(world, { x: 5, y: 5 })).toEqual([]);
  });

  it('finds a point deep in a terrain slab', () => {
    const ground = addEntity(
      { x: 0, y: 0 },
      new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        50,
      ),
    );
    world.update();

    expect(overlapPoint(world, { x: 50, y: 40 })).toEqual([ground]);
    expect(overlapPoint(world, { x: 50, y: -1 })).toEqual([]);
  });

  it('finds colliders with a rigid body', () => {
    const body = addEntity({ x: 0, y: 0 }, new CircleCollider(1));

    addRigidBodyComponent(world, body);
    world.update();

    expect(overlapPoint(world, { x: 0, y: 0 })).toEqual([body]);
  });

  it('only finds colliders whose category is in the mask', () => {
    const wall = addEntity({ x: 0, y: 0 }, new CircleCollider(1), {
      category: 0b01,
    });
    addEntity({ x: 0, y: 0 }, new CircleCollider(1), { category: 0b10 });
    world.update();

    expect(overlapPoint(world, { x: 0, y: 0 }, { mask: 0b01 })).toEqual([wall]);
  });

  it('skips sensors unless asked to include them', () => {
    const sensor = addEntity({ x: 0, y: 0 }, new CircleCollider(1), {
      sensor: true,
    });
    const wall = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    expect(overlapPoint(world, { x: 0, y: 0 })).toEqual([wall]);
    expect(
      overlapPoint(world, { x: 0, y: 0 }, { includeSensors: true }).sort(
        byEntity,
      ),
    ).toEqual([sensor, wall].sort(byEntity));
  });

  it('does not find a collider the broad phase has no proxy for yet', () => {
    world.update();
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));

    expect(overlapPoint(world, { x: 0, y: 0 })).toEqual([]);
  });

  it('does not find a collider whose component was replaced since the broad phase ran', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    expect(overlapPoint(world, { x: 0, y: 0 })).toEqual([]);
  });

  it('does not find an entity removed since the broad phase ran', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    world.removeEntity(entity);

    expect(overlapPoint(world, { x: 0, y: 0 })).toEqual([]);
  });

  it('throws for a point that is not finite', () => {
    expect(() => overlapPoint(world, { x: Infinity, y: 0 })).toThrow(
      'overlapPoint: the point (Infinity, 0) must be finite.',
    );
    expect(() => overlapPoint(world, { x: 0, y: NaN })).toThrow('overlapPoint');
  });

  it('throws when the world has no broad phase', () => {
    expect(() => overlapPoint(new EcsWorld(), { x: 0, y: 0 })).toThrow(
      'The world has no broad phase',
    );
  });
});
