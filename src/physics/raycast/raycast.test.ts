import { beforeEach, describe, expect, it, vi } from 'vitest';
import { raycast } from './raycast.js';
import { raycastCircle } from './raycast-circle.js';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import {
  createBroadPhase,
  findBroadPhase,
} from '../broad-phase/create-broad-phase.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';

vi.mock('./raycast-circle.js', { spy: true });

const raycastCircleSpy = vi.mocked(raycastCircle);

describe('raycast', () => {
  let world: EcsWorld;

  beforeEach(() => {
    raycastCircleSpy.mockClear();
    world = new EcsWorld();
    createBroadPhase(world);
    world.addSystem(createBroadPhaseEcsSystem([]));
  });

  function addEntity(
    position: Vector2,
    collider: CircleCollider | PolygonCollider,
  ): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider });

    return entity;
  }

  it('should return no hits when nothing is in range of the ray', () => {
    addEntity({ x: 100, y: 100 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hits).toHaveLength(0);
  });

  it('should skip entities whose AABB does not overlap the ray', () => {
    addEntity({ x: 0, y: 50 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hits).toHaveLength(0);
  });

  it('should report the hit entity, point, normal, and distance', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hits).toHaveLength(1);
    expect(hits[0].entity).toBe(entity);
    expect(hits[0].point.x).toBeCloseTo(-1);
    expect(hits[0].normal.x).toBeCloseTo(-1);
    expect(hits[0].distance).toBeCloseTo(4);
  });

  it('should sort hits by distance from the start point by default', () => {
    const far = addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    const near = addEntity({ x: -3, y: 0 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });

    expect(hits.map((hit) => hit.entity)).toEqual([near, far]);
  });

  it('should return every hit, in no particular order, when sort is disabled', () => {
    addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    addEntity({ x: -3, y: 0 }, new CircleCollider(1));
    world.update();

    const sorted = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });
    const unsorted = raycast(
      world,
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      {
        sort: false,
      },
    );

    const byEntity = (a: number, b: number): number => a - b;

    expect(unsorted).toHaveLength(sorted.length);
    expect(unsorted.map((hit) => hit.entity).sort(byEntity)).toEqual(
      sorted.map((hit) => hit.entity).sort(byEntity),
    );
  });

  it('should not include entities the ray does not intersect, even if their AABB overlaps', () => {
    // A circle's square AABB extends into its own corners, which the
    // circle itself doesn't reach; a ray clipping just that corner overlaps
    // the AABB broad-phase check without ever touching the circle.
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -5, y: -5 }, { x: -0.99, y: -0.99 });

    expect(hits).toHaveLength(0);
  });

  it('should not test the shape of a collider whose tree box the ray reaches but whose AABB it misses', () => {
    // The tree's fat box is the AABB grown by `aabbMargin` (0.1) on every
    // side, so a ray along y = 1.05 reaches the fat box of a radius-1 circle
    // at the origin but passes above its AABB.
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();

    const hits = raycast(world, { x: -5, y: 1.05 }, { x: 5, y: 1.05 });

    expect(hits).toHaveLength(0);
    expect(raycastCircleSpy).not.toHaveBeenCalled();
  });

  it('should hit an entity with no rotation component, treating it as unrotated', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 0, y: 0 } });
    addColliderComponent(world, entity, {
      collider: new PolygonCollider([
        { x: -2, y: -1 },
        { x: 2, y: -1 },
        { x: 2, y: 1 },
        { x: -2, y: 1 },
      ]),
    });
    world.update();

    const hits = raycast(world, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hits).toHaveLength(1);
    expect(hits[0].entity).toBe(entity);
    expect(hits[0].point.x).toBeCloseTo(-2);
    expect(hits[0].distance).toBeCloseTo(3);
  });

  it('should only hit colliders whose category is in the mask', () => {
    const wall = world.createEntity();
    const window = world.createEntity();

    addPositionComponent(world, wall, { local: { x: 3, y: 0 } });
    addColliderComponent(world, wall, {
      collider: new CircleCollider(1),
      category: 0b01,
    });
    addPositionComponent(world, window, { local: { x: -3, y: 0 } });
    addColliderComponent(world, window, {
      collider: new CircleCollider(1),
      category: 0b10,
    });
    world.update();

    const hits = raycast(
      world,
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      {
        mask: 0b01,
      },
    );

    expect(hits.map((hit) => hit.entity)).toEqual([wall]);
  });

  it('should not hit a collider the broad phase has no proxy for yet', () => {
    addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    world.update();
    // Added after the broad phase ran, at the origin the ray passes through.
    addEntity({ x: 0, y: 0 }, new CircleCollider(1));

    const hits = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });

    expect(hits).toHaveLength(1);
  });

  it('should not hit a collider whose component was replaced since the broad phase ran', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    // The proxy is still in the tree, but the new component's bounds
    // haven't been computed yet.
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    const hits = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });

    expect(hits).toHaveLength(0);
  });

  it('should not hit an entity removed since the broad phase ran', () => {
    const entity = addEntity({ x: 0, y: 0 }, new CircleCollider(1));
    world.update();
    world.removeEntity(entity);

    const hits = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });

    expect(hits).toHaveLength(0);
  });

  it('should only test the shapes of colliders on the ray', () => {
    const gridSize = 10;
    const spacing = 2;
    const diagonal: number[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let column = 0; column < gridSize; column++) {
        const entity = addEntity(
          { x: column * spacing, y: row * spacing },
          new CircleCollider(0.5),
        );

        if (row === column) {
          diagonal.push(entity);
        }
      }
    }

    world.update();

    const last = (gridSize - 1) * spacing;
    const hits = raycast(world, { x: -1, y: -1 }, { x: last + 1, y: last + 1 });

    expect(hits.map((hit) => hit.entity)).toEqual(diagonal);
    expect(raycastCircleSpy).toHaveBeenCalledTimes(gridSize);

    for (const [body] of raycastCircleSpy.mock.calls) {
      expect(body.position.x).toBe(body.position.y);
    }
  });

  it('should hit both static colliders and colliders with a rigid body', () => {
    const wall = addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    const body = addEntity({ x: -3, y: 0 }, new CircleCollider(1));

    addRigidBodyComponent(world, body);
    world.update();

    // One collider in each of the broad phase's trees.
    expect(findBroadPhase(world).movingTree.proxyCount).toBe(1);
    expect(findBroadPhase(world).staticTree.proxyCount).toBe(1);

    const hits = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 });

    expect(hits.map((hit) => hit.entity)).toEqual([body, wall]);
  });

  it('should throw when an end of the ray is not finite', () => {
    expect(() => raycast(world, { x: 0, y: 0 }, { x: Infinity, y: 0 })).toThrow(
      'raycast: the ray from (0, 0) to (Infinity, 0)',
    );
  });

  it('should throw when the world has no broad phase', () => {
    const worldWithoutBroadPhase = new EcsWorld();

    expect(() =>
      raycast(worldWithoutBroadPhase, { x: -10, y: 0 }, { x: 10, y: 0 }),
    ).toThrow('The world has no broad phase');
  });

  it('should pass through sensors unless asked to include them', () => {
    const sensor = world.createEntity();

    addPositionComponent(world, sensor, { local: { x: -3, y: 0 } });
    addColliderComponent(world, sensor, {
      collider: new CircleCollider(1),
      sensor: true,
    });

    const wall = addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    world.update();

    const start = { x: -10, y: 0 };
    const end = { x: 10, y: 0 };

    expect(raycast(world, start, end).map((hit) => hit.entity)).toEqual([wall]);
    expect(
      raycast(world, start, end, { includeSensors: true }).map(
        (hit) => hit.entity,
      ),
    ).toEqual([sensor, wall]);
  });
});
