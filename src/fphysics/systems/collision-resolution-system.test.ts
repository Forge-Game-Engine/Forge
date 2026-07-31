import { beforeEach, describe, expect, it } from 'vitest';
import {
  CollisionResolutionOptions,
  createCollisionResolutionEcsSystem,
} from './collision-resolution-system.js';
import { addPositionComponent, Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
} from '../components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { ContactConstraint } from '../types/contact-constraint.js';

describe('createCollisionResolutionEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let collisionManifolds: CollisionManifold[];
  let contactConstraints: ContactConstraint[];

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    collisionManifolds = [];
    contactConstraints = [];
  });

  function addSystem(options?: Partial<CollisionResolutionOptions>): void {
    world.addSystem(
      createCollisionResolutionEcsSystem(
        collisionManifolds,
        contactConstraints,
        time,
        options,
      ),
    );
  }

  function addCircleEntity(
    position: Vector2,
    radius: number,
    isDynamic: boolean,
    colliderOptions: Partial<ColliderEcsComponent> = {},
    rigidBodyOptions: Partial<RigidBodyEcsComponent> = {},
  ): { entity: number; rigidBody: RigidBodyEcsComponent | null } {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: position });
    addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
      ...colliderOptions,
    });

    if (!isDynamic) {
      return { entity, rigidBody: null };
    }

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      ...rigidBodyOptions,
    });

    return { entity, rigidBody };
  }

  function pushManifold(
    entityA: number,
    entityB: number,
    normal: Vector2,
    depth: number,
    contactPoint: Vector2,
    featureId: number = 0,
  ): void {
    collisionManifolds.push({
      entityA,
      entityB,
      normal,
      depth,
      contactPoints: [contactPoint],
      featureIds: [featureId],
    });
  }

  it('should push two overlapping dynamic bodies apart along the normal', () => {
    addSystem({ restitutionThreshold: 100 });

    const { entity: entityA, rigidBody: rigidBodyA } = addCircleEntity(
      new Vector2(0, 0),
      1,
      true,
      { restitution: 0 },
    );
    const { entity: entityB, rigidBody: rigidBodyB } = addCircleEntity(
      new Vector2(1.5, 0),
      1,
      true,
      { restitution: 0 },
    );

    rigidBodyA!.velocity = new Vector2(1, 0);
    rigidBodyB!.velocity = new Vector2(-1, 0);

    pushManifold(
      entityA,
      entityB,
      new Vector2(1, 0),
      0.5,
      new Vector2(0.75, 0),
    );

    world.update();

    const relativeNormalVelocity = rigidBodyB!.velocity
      .subtract(rigidBodyA!.velocity)
      .dot(new Vector2(1, 0));

    expect(relativeNormalVelocity).toBeGreaterThan(-1e-3);
  });

  it('should apply restitution to a fast, newly-appearing impact', () => {
    addSystem();

    const { entity: ball, rigidBody } = addCircleEntity(
      new Vector2(0, 1),
      1,
      true,
      { restitution: 1 },
    );
    const { entity: ground } = addCircleEntity(
      new Vector2(0, -100),
      100,
      false,
      {
        restitution: 1,
      },
    );

    rigidBody!.velocity = new Vector2(0, -5);

    pushManifold(ground, ball, new Vector2(0, 1), 0.01, new Vector2(0, 0.99));

    world.update();

    expect(rigidBody!.velocity.y).toBeGreaterThan(4);
  });

  it('should not re-apply restitution to a contact reused from the previous tick', () => {
    addSystem();

    const { entity: ball, rigidBody } = addCircleEntity(
      new Vector2(0, 1),
      1,
      true,
      { restitution: 1 },
    );
    const { entity: ground } = addCircleEntity(
      new Vector2(0, -100),
      100,
      false,
      {
        restitution: 1,
      },
    );

    rigidBody!.velocity = new Vector2(0, -5);
    pushManifold(ground, ball, new Vector2(0, 1), 0.01, new Vector2(0, 0.99));
    world.update();

    expect(rigidBody!.velocity.y).toBeGreaterThan(4);
    expect(contactConstraints[0].isReused).toBe(false);

    collisionManifolds.length = 0;
    rigidBody!.velocity = new Vector2(0, -5);
    pushManifold(ground, ball, new Vector2(0, 1), 0.01, new Vector2(0, 0.99));
    world.update();

    expect(contactConstraints[0].isReused).toBe(true);
    expect(rigidBody!.velocity.y).toBeLessThan(3.5);
  });

  it('should warm-start by carrying accumulated impulse across ticks for a matching feature id', () => {
    addSystem();

    const { entity: entityA, rigidBody: rigidBodyA } = addCircleEntity(
      new Vector2(0, 0),
      1,
      true,
    );
    const { entity: entityB } = addCircleEntity(new Vector2(1.9, 0), 1, false);

    rigidBodyA!.velocity = new Vector2(1, 0);
    pushManifold(
      entityA,
      entityB,
      new Vector2(1, 0),
      0.1,
      new Vector2(0.95, 0),
    );
    world.update();

    const firstAccumulatedImpulse =
      contactConstraints[0].accumulatedNormalImpulse;

    expect(firstAccumulatedImpulse).toBeGreaterThan(0);

    collisionManifolds.length = 0;
    pushManifold(
      entityA,
      entityB,
      new Vector2(1, 0),
      0.1,
      new Vector2(0.95, 0),
    );
    world.update();

    expect(contactConstraints[0].isReused).toBe(true);
    expect(contactConstraints[0].accumulatedNormalImpulse).toBeGreaterThan(0);
  });

  it('should reduce tangential sliding velocity when friction is applied', () => {
    addSystem();

    const { entity: ball, rigidBody } = addCircleEntity(
      new Vector2(0, 1),
      1,
      true,
      { friction: 1 },
    );
    const { entity: ground } = addCircleEntity(
      new Vector2(0, -100),
      100,
      false,
      {
        friction: 1,
      },
    );

    rigidBody!.velocity = new Vector2(2, 0);
    pushManifold(ground, ball, new Vector2(0, 1), 0.1, new Vector2(0, 0.9));

    world.update();

    expect(Math.abs(rigidBody!.velocity.x)).toBeLessThan(2);
  });

  it('should not throw and should skip solving when neither body has a rigid body', () => {
    addSystem();

    const { entity: entityA } = addCircleEntity(new Vector2(0, 0), 1, false);
    const { entity: entityB } = addCircleEntity(new Vector2(1.5, 0), 1, false);

    pushManifold(
      entityA,
      entityB,
      new Vector2(1, 0),
      0.5,
      new Vector2(0.75, 0),
    );

    expect(() => world.update()).not.toThrow();
    expect(contactConstraints).toHaveLength(1);
  });

  it('should clear stale contact constraints once a manifold no longer appears', () => {
    addSystem();

    const { entity: entityA, rigidBody: rigidBodyA } = addCircleEntity(
      new Vector2(0, 0),
      1,
      true,
    );
    const { entity: entityB } = addCircleEntity(new Vector2(1.5, 0), 1, false);

    rigidBodyA!.velocity = new Vector2(1, 0);
    pushManifold(
      entityA,
      entityB,
      new Vector2(1, 0),
      0.5,
      new Vector2(0.75, 0),
    );
    world.update();

    expect(contactConstraints).toHaveLength(1);

    collisionManifolds.length = 0;
    world.update();

    expect(contactConstraints).toHaveLength(0);
  });
});
