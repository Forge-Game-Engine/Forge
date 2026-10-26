import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  positionId,
  Time,
  transformInterpolationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import {
  createBroadPhase,
  findBroadPhase,
} from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import { queryAabb } from './query-aabb.js';

const byEntity = (a: number, b: number): number => a - b;

describe('queryAabb', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    createBroadPhase(world);
    world.addSystem(createBroadPhaseEcsSystem([]));
  });

  function addEntity(
    position: Vector2,
    collider: Collider,
    options: { category?: number; sensor?: boolean } = {},
  ): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider, ...options });

    return entity;
  }

  const box = (minX: number, minY: number, maxX: number, maxY: number) => ({
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  });

  it('finds a collider whose bounds overlap the box', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    addEntity({ x: 10, y: 0 }, new CircleCollider(1));
    world.update();

    expect(queryAabb(world, box(-2, -2, 0, 0))).toEqual([entity]);
  });

  it('finds a collider whose bounds only touch the box', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    expect(queryAabb(world, box(1, -5, 3, 5))).toEqual([entity]);
  });

  it('skips a collider whose tree box overlaps the box but whose bounds do not', () => {
    // The tree's fat box is the bounds grown by `aabbMargin` (0.1).
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    expect(queryAabb(world, box(1.05, -5, 3, 5))).toEqual([]);
  });

  it('tests bounds only, finding a circle by its bounding square corner', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    expect(queryAabb(world, box(0.9, 0.9, 2, 2))).toEqual([entity]);
  });

  it('finds static colliders and colliders with a rigid body', () => {
    const wall = addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    const body = addEntity({ x: -3, y: 0 }, new CircleCollider(1));

    addRigidBodyComponent(world, body);
    world.update();

    expect(findBroadPhase(world).movingTree.proxyCount).toBe(1);
    expect(findBroadPhase(world).staticTree.proxyCount).toBe(1);
    expect(queryAabb(world, box(-5, -1, 5, 1)).sort(byEntity)).toEqual(
      [wall, body].sort(byEntity),
    );
  });

  it('finds a dynamic body by bounds at its local pose, not where it is drawn', () => {
    // After the broad phase, so it sees the pose a tick starts with and the
    // transform pass then draws the body where it's interpolated.
    world.addSystem(createTransformEcsSystem(new Time()));

    const body = addEntity({ x: 20, y: 0 }, new CircleCollider(1));

    addRigidBodyComponent(world, body);

    const interpolation = world.getComponent(body, transformInterpolationId);

    if (!interpolation) {
      throw new Error('addRigidBodyComponent added no interpolation.');
    }

    // As if the latest fixed step had moved it from the origin.
    interpolation.stepStart.position.x = 0;
    world.update();

    expect(queryAabb(world, box(19.5, -0.5, 20.5, 0.5))).toEqual([body]);
    expect(queryAabb(world, box(-0.5, -0.5, 0.5, 0.5))).toEqual([]);

    // Moved within the tree's margin since the broad phase ran: the bounds
    // follow the body, past the `aabb` the broad phase left.
    const position = world.getComponent(body, positionId);

    if (!position) {
      throw new Error('The body has no position.');
    }

    position.local.x = 20.05;

    expect(queryAabb(world, box(21.02, -0.5, 21.04, 0.5))).toEqual([body]);
  });

  it('finds every collider with an infinite box, but not one with no bounds yet', () => {
    const first = addEntity({ x: -1000, y: 50 }, new CircleCollider(1));
    const second = addEntity({ x: 2000, y: -70 }, new CircleCollider(1));
    const replaced = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    // The proxy is still in the tree, but the new component's bounds are
    // still the empty box they start as.
    addColliderComponent(world, replaced, { collider: new CircleCollider(1) });

    const everything = box(-Infinity, -Infinity, Infinity, Infinity);

    expect(queryAabb(world, everything).sort(byEntity)).toEqual(
      [first, second].sort(byEntity),
    );
  });

  it('only finds colliders whose category is in the mask', () => {
    const wall = addEntity({ x: 0, y: 0 }, new CircleCollider(1), {
      category: 0b01,
    });
    addEntity({ x: 0, y: 0 }, new CircleCollider(1), { category: 0b10 });
    world.update();

    expect(queryAabb(world, box(-1, -1, 1, 1), { mask: 0b01 })).toEqual([wall]);
  });

  it('skips sensors unless asked to include them', () => {
    const sensor = addEntity({ x: 0, y: 0 }, new CircleCollider(1), {
      sensor: true,
    });
    const wall = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    expect(queryAabb(world, box(-1, -1, 1, 1))).toEqual([wall]);
    expect(
      queryAabb(world, box(-1, -1, 1, 1), { includeSensors: true }).sort(
        byEntity,
      ),
    ).toEqual([sensor, wall].sort(byEntity));
  });

  it('does not find a collider the broad phase has no proxy for yet', () => {
    world.update();
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));

    expect(queryAabb(world, box(-1, -1, 1, 1))).toEqual([]);
  });

  it('does not find an entity removed since the broad phase ran', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    world.removeEntity(entity);

    expect(queryAabb(world, box(-1, -1, 1, 1))).toEqual([]);
  });

  it('throws for a box with a NaN coordinate', () => {
    expect(() => queryAabb(world, box(0, NaN, 1, 1))).toThrow('queryAabb');
  });

  it('throws for a box whose min is greater than its max', () => {
    expect(() => queryAabb(world, box(2, 0, 1, 1))).toThrow(
      'queryAabb: the box from (2, 0) to (1, 1)',
    );
  });

  it('throws when the world has no broad phase', () => {
    expect(() => queryAabb(new EcsWorld(), box(0, 0, 1, 1))).toThrow(
      'The world has no broad phase',
    );
  });
});
