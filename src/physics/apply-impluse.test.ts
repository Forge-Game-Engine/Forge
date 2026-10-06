import { beforeEach, describe, expect, it } from 'vitest';
import { applyImpulse } from './apply-impluse.js';
import { addPositionComponent, addRotationComponent } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vector2 } from '../math/index.js';
import { CircleCollider, PolygonCollider } from './colliders/index.js';
import {
  addColliderComponent,
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  RigidBodyType,
} from './components/index.js';

describe('applyImpulse', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  function createBody(
    type: RigidBodyType,
    position: Vector2,
    rotation: number = 0,
  ): { entity: number; rigidBody: RigidBodyEcsComponent } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity, { local: rotation });
    // A circle of mass 2, centered on the entity's origin.
    addColliderComponent(world, entity, {
      collider: new CircleCollider(1, 2 / Math.PI),
    });

    return {
      entity,
      rigidBody: addRigidBodyComponent(world, entity, { type }),
    };
  }

  it('changes velocity by impulse * (1 / mass) for a dynamic body', () => {
    const { entity, rigidBody } = createBody('dynamic', { x: 3, y: 4 });

    applyImpulse(world, entity, { x: 10, y: 0 }, { x: 3, y: 4 });

    expect(rigidBody.velocity).toEqual({ x: 5, y: 0 });
    expect(rigidBody.angularVelocity).toBe(0);
  });

  it('imparts spin when the impulse is applied off-center', () => {
    const { entity, rigidBody } = createBody('dynamic', { x: 0, y: 0 });

    applyImpulse(world, entity, { x: 0, y: 1 }, { x: 1, y: 0 });

    expect(rigidBody.angularVelocity).toBeGreaterThan(0);
  });

  it("measures the lever arm from the collider's center of mass, not the entity's position", () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 10, y: 0 } });
    addRotationComponent(world, entity, { local: Math.PI / 2 });
    // A triangle whose centroid is (1, 0) in local space, which the entity's
    // rotation turns to (0, 1): a world center of mass at (10, 1).
    addColliderComponent(world, entity, {
      collider: new PolygonCollider([
        { x: 0, y: -1 },
        { x: 3, y: 0 },
        { x: 0, y: 1 },
      ]),
    });
    const rigidBody = addRigidBodyComponent(world, entity);

    applyImpulse(world, entity, { x: 5, y: 0 }, { x: 10, y: 1 });

    expect(rigidBody.velocity.x).toBeGreaterThan(0);
    expect(rigidBody.angularVelocity).toBeCloseTo(0);
  });

  it.each(['static', 'kinematic'] as const)(
    'does not change velocity or angularVelocity for a %s body',
    (type) => {
      const { entity, rigidBody } = createBody(type, { x: 0, y: 0 });

      applyImpulse(world, entity, { x: 10, y: 5 }, { x: 1, y: 1 });

      expect(rigidBody.velocity).toEqual({ x: 0, y: 0 });
      expect(rigidBody.angularVelocity).toBe(0);
    },
  );

  it('throws for a dynamic body with no collider to take its mass from', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRigidBodyComponent(world, entity);

    expect(() =>
      applyImpulse(world, entity, { x: 1, y: 0 }, { x: 0, y: 0 }),
    ).toThrow(/has no ColliderEcsComponent/);
  });
});
