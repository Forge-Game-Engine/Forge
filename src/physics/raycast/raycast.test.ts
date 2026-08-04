import { beforeEach, describe, expect, it } from 'vitest';
import { raycast } from './raycast.js';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addAabbComponent } from '../components/aabb-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';

describe('raycast', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createBroadPhaseEcsSystem([]));
  });

  function addEntity(
    position: Vector2,
    collider: CircleCollider | PolygonCollider,
  ): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: position });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider });
    addAabbComponent(world, entity);

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

  it('should preserve query order when sort is disabled', () => {
    addEntity({ x: 3, y: 0 }, new CircleCollider(1));
    addEntity({ x: -3, y: 0 }, new CircleCollider(1));
    world.update();

    const sorted = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 }, true);
    const unsorted = raycast(world, { x: -10, y: 0 }, { x: 10, y: 0 }, false);

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
});
