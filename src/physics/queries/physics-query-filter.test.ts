import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
  Time,
  transformInterpolationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { createBroadPhase } from '../broad-phase/create-broad-phase.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from '../systems/broad-phase-system.js';
import {
  defaultPhysicsQueryFilter,
  getQueryComponentAccessors,
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
      getQueryComponentAccessors(world),
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

  it('reads a static collider at its world pose with the broad-phase bounds', () => {
    const entity = addCollider();
    const candidate = read(entity);
    const collider = world.getComponent<ColliderEcsComponent>(
      entity,
      colliderId,
    );

    expect(candidate?.body.collider).toBe(collider?.collider);
    expect(candidate?.body.position).toBe(
      world.getComponent<PositionEcsComponent>(entity, positionId)?.world,
    );
    expect(candidate?.body.rotation).toBe(0);
    expect(candidate?.bounds).toBe(collider?.aabb);
  });

  describe('a moving body drawn behind its simulated pose', () => {
    beforeEach(() => {
      // After the broad phase, so it sees the pose a tick starts with and
      // the transform pass then draws the bodies where they're interpolated.
      world.addSystem(createTransformEcsSystem(new Time()));
    });

    // A body whose `local` (where its latest step left it) is at x = 20,
    // turned a quarter turn, which the broad phase saw there, while a
    // frame's transform pass draws it at the step's start, the origin
    // unrotated.
    function addMovedBody(type: 'dynamic' | 'kinematic' | 'static'): number {
      const entity = world.createEntity();

      addPositionComponent(world, entity, { local: { x: 20, y: 0 } });
      addRotationComponent(world, entity, { local: Math.PI / 2 });
      // A 10 x 2 box, 2 wide and 10 tall once turned.
      addColliderComponent(world, entity, {
        collider: new PolygonCollider([
          { x: -5, y: -1 },
          { x: 5, y: -1 },
          { x: 5, y: 1 },
          { x: -5, y: 1 },
        ]),
      });
      addRigidBodyComponent(world, entity, { type });

      const interpolation = world.getComponent(
        entity,
        transformInterpolationId,
      );

      if (!interpolation) {
        throw new Error('addRigidBodyComponent added no interpolation.');
      }

      // As if the latest fixed step had moved and turned it from the origin.
      interpolation.stepStart.position.x = 0;
      interpolation.stepStart.rotation = 0;
      world.update();

      return entity;
    }

    it.each(['dynamic', 'kinematic'] as const)(
      'reads a %s body at its local pose, with bounds from that pose',
      (type) => {
        const entity = addMovedBody(type);
        const position = world.getComponent<PositionEcsComponent>(
          entity,
          positionId,
        );
        const candidate = read(entity);

        expect(position?.world.x).toBeCloseTo(0);
        expect(candidate?.body.position).toBe(position?.local);
        expect(candidate?.body.rotation).toBeCloseTo(Math.PI / 2);
        expect(candidate?.bounds.min.x).toBeCloseTo(19);
        expect(candidate?.bounds.max.x).toBeCloseTo(21);
        expect(candidate?.bounds.min.y).toBeCloseTo(-5);
        expect(candidate?.bounds.max.y).toBeCloseTo(5);

        if (!position) {
          throw new Error('The body has no position.');
        }

        // Moved since the broad phase ran: the bounds follow the body, not
        // the `aabb` the broad phase left.
        position.local.x = 20.05;

        expect(read(entity)?.bounds.max.x).toBeCloseTo(21.05);
      },
    );

    it('reads a static body at its world pose with the broad-phase bounds', () => {
      const entity = addMovedBody('static');

      // The broad phase sees where the first tick drew it.
      world.update();

      const candidate = read(entity);

      expect(candidate?.body.position).toBe(
        world.getComponent<PositionEcsComponent>(entity, positionId)?.world,
      );
      expect(candidate?.bounds).toBe(
        world.getComponent<ColliderEcsComponent>(entity, colliderId)?.aabb,
      );
    });
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
