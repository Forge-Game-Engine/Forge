import { describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import { CollisionBody } from '../types/collision-body.js';
import { raycast } from './raycast.js';
import { raycastChain } from './raycast-chain.js';

function square(left: number, top: number, size: number): Vector2[] {
  return [
    { x: left, y: top },
    { x: left + size, y: top },
    { x: left + size, y: top + size },
    { x: left, y: top + size },
  ];
}

function chainBody(
  loops: Vector2[][],
  position: Vector2 = { x: 0, y: 0 },
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider: new ChainCollider(loops) };
}

describe('raycastChain', () => {
  it('hits an edge from in front with its outward normal', () => {
    const hit = raycastChain(
      chainBody([square(0, 0, 10)]),
      { x: -5, y: 5 },
      { x: 5, y: 5 },
    );

    expect(hit?.point.x).toBeCloseTo(0);
    expect(hit?.point.y).toBeCloseTo(5);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(5);
  });

  it('misses an edge from behind', () => {
    expect(
      raycastChain(
        chainBody([square(0, 0, 10)]),
        { x: 5, y: 5 },
        { x: 15, y: 5 },
      ),
    ).toBeNull();
  });

  it('hits the next solid a ray starting inside solid enters', () => {
    const hit = raycastChain(
      chainBody([square(0, 0, 10), square(20, 0, 10)]),
      { x: 5, y: 5 },
      { x: 25, y: 5 },
    );

    expect(hit?.point.x).toBeCloseTo(20);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.distance).toBeCloseTo(15);
  });

  it('hits the wall of a hole a ray inside it reaches', () => {
    const room = square(0, 0, 10).reverse();
    const hit = raycastChain(
      chainBody([room]),
      { x: 5, y: 5 },
      { x: 5, y: 15 },
    );

    expect(hit?.point.y).toBeCloseTo(10);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
  });

  it('keeps the closest of several hits', () => {
    const hit = raycastChain(
      chainBody([square(20, 0, 10), square(0, 0, 10)]),
      { x: -5, y: 5 },
      { x: 35, y: 5 },
    );

    expect(hit?.point.x).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(5);
  });

  it('misses when the segment stops short', () => {
    expect(
      raycastChain(
        chainBody([square(0, 0, 10)]),
        { x: -5, y: 5 },
        { x: -1, y: 5 },
      ),
    ).toBeNull();
  });

  it('hits a rotated, translated chain in its world pose', () => {
    // A quarter turn (from +X towards +Y) puts the square's left edge,
    // local x = 0, on world y = 0 between x = 90 and 100, facing up.
    const hit = raycastChain(
      chainBody([square(0, 0, 10)], { x: 100, y: 0 }, Math.PI / 2),
      { x: 95, y: -5 },
      { x: 95, y: 5 },
    );

    expect(hit?.point.x).toBeCloseTo(95);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
    expect(hit?.distance).toBeCloseTo(5);
  });

  it('is found by raycast', () => {
    const world = new EcsWorld();

    world.addSystem(createBroadPhaseEcsSystem([]));

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new ChainCollider([square(0, 0, 10)]),
    });
    world.update();

    const hits = raycast(world, { x: -5, y: 5 }, { x: 5, y: 5 });

    expect(hits).toHaveLength(1);
    expect(hits[0].entity).toBe(entity);
    expect(hits[0].point.x).toBeCloseTo(0);
  });
});
