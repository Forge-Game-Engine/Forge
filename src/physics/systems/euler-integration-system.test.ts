import { beforeEach, describe, expect, it } from 'vitest';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import {
  addParentComponent,
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  positionId,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsWorld, formatEntity } from '../../ecs/index.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import {
  addRigidBodyComponent,
  rigidBodyId,
  RigidBodyType,
} from '../components/rigidbody-component.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { addColliderComponent } from '../components/collider-component.js';

/**
 * A circle with a mass and moment of inertia of 1, for a dynamic body to
 * take its mass data from. Its mask of `0` keeps it out of collisions.
 */
function addUnitMassCollider(world: EcsWorld, entity: number): void {
  addColliderComponent(world, entity, {
    collider: new CircleCollider(Math.SQRT2, 1 / (2 * Math.PI)),
    mask: 0,
  });
}

describe('createEulerIntegrationEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(1000 / 60);

    world.addSystem(createEulerIntegrationEcsSystem(time));
  });

  function createBody(type: RigidBodyType): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: { x: 0, y: 0 },
    });
    addRotationComponent(world, entity);

    addUnitMassCollider(world, entity);

    addRigidBodyComponent(world, entity, {
      velocity: { x: 1, y: 0 },
      angularVelocity: 1,
      type,
    });

    return entity;
  }

  it('integrates a dynamic body position/rotation from velocity/angularVelocity', () => {
    const entity = createBody('dynamic');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.local.x).toBeGreaterThan(0);
    expect(rotation.local).toBeGreaterThan(0);
  });

  it('integrates a kinematic body the same as a dynamic one', () => {
    const entity = createBody('kinematic');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.local.x).toBeGreaterThan(0);
    expect(rotation.local).toBeGreaterThan(0);
  });

  it('never moves a static body, even with a nonzero velocity', () => {
    const entity = createBody('static');

    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.local).toEqual({ x: 0, y: 0 });
    expect(rotation.local).toBe(0);
  });

  it('keeps a moving body where it integrated to when the transform system runs', () => {
    // The transform system derives `world` from `local` every frame, so
    // physics has to move bodies through `local` or they snap back.
    world.addSystem(createTransformEcsSystem());

    const entity = createBody('dynamic');

    world.update();
    world.update();
    world.update();

    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    expect(position.world).toEqual(position.local);
    expect(position.world.x).toBeGreaterThan(0);
    expect(rotation.world).toBe(rotation.local);
    expect(rotation.world).toBeGreaterThan(0);
  });

  function createOffCenterBody(
    type: RigidBodyType,
    angularVelocity: number,
  ): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    // A triangle whose centroid is (1, 0), away from the entity's origin.
    addColliderComponent(world, entity, {
      collider: new PolygonCollider([
        { x: 0, y: -1 },
        { x: 3, y: 0 },
        { x: 0, y: 1 },
      ]),
    });
    addRigidBodyComponent(world, entity, { angularVelocity, type });

    return entity;
  }

  function worldCentroid(entity: number): { x: number; y: number } {
    const position = world.getComponent(entity, positionId)!;
    const rotation = world.getComponent(entity, rotationId)!;

    return {
      x: position.local.x + Math.cos(rotation.local),
      y: position.local.y + Math.sin(rotation.local),
    };
  }

  it('turns a dynamic body about its center of mass', () => {
    const entity = createOffCenterBody('dynamic', 2);

    for (let i = 0; i < 30; i++) {
      world.update();

      const centroid = worldCentroid(entity);

      expect(centroid.x).toBeCloseTo(1);
      expect(centroid.y).toBeCloseTo(0);
    }

    expect(world.getComponent(entity, rotationId)!.local).toBeCloseTo(1);
  });

  it("moves a dynamic body's center of mass by its velocity while it turns", () => {
    const entity = createOffCenterBody('dynamic', 2);
    const rigidBody = world.getComponent(entity, rigidBodyId)!;

    rigidBody.velocity = { x: 6, y: -3 };

    for (let i = 0; i < 30; i++) {
      world.update();
    }

    const centroid = worldCentroid(entity);

    expect(centroid.x).toBeCloseTo(1 + 6 * 0.5);
    expect(centroid.y).toBeCloseTo(-3 * 0.5);
  });

  it('turns a kinematic body about its origin, whatever its collider', () => {
    const entity = createOffCenterBody('kinematic', 2);

    for (let i = 0; i < 30; i++) {
      world.update();
    }

    expect(world.getComponent(entity, positionId)!.local).toEqual({
      x: 0,
      y: 0,
    });
    expect(world.getComponent(entity, rotationId)!.local).toBeCloseTo(1);
  });

  it('keeps a teleport written to local after the transform pass', () => {
    world = new EcsWorld();

    const transformSystem = createTransformEcsSystem();
    const integrationSystem = createEulerIntegrationEcsSystem(time);
    let teleportTo: { x: number; y: number } | null = null;

    world.addSystem(transformSystem);
    world.addSystem(integrationSystem, { after: [transformSystem] });

    const entity = createOffCenterBody('dynamic', 2);

    // Game code that teleports the body between the transform pass and
    // integration.
    world.addSystem(
      {
        query: [],
        update: () => {
          if (teleportTo !== null) {
            world.getComponent(entity, positionId)!.local = teleportTo;
            teleportTo = null;
          }
        },
      },
      { after: [transformSystem], before: [integrationSystem] },
    );

    world.update();
    teleportTo = { x: 100, y: 50 };
    world.update();

    const centroid = worldCentroid(entity);
    const rotation = world.getComponent(entity, rotationId)!.local;

    // Integration turned the body about its centroid from where it was
    // teleported to, rather than overwriting the teleport.
    expect(rotation).toBeCloseTo(4 / 60);
    expect(centroid.x).toBeCloseTo(100 + Math.cos(2 / 60));
    expect(centroid.y).toBeCloseTo(50 + Math.sin(2 / 60));
  });

  it('throws for a moving body with a parent', () => {
    const parent = world.createEntity();
    const entity = createBody('dynamic');

    addParentComponent(world, entity, { parent });

    expect(() => world.update()).toThrow(
      `Rigid body entity ${formatEntity(entity)} has a ParentEcsComponent.`,
    );
  });

  it('allows a static body with a parent', () => {
    const parent = world.createEntity();
    const entity = createBody('static');

    addParentComponent(world, entity, { parent });

    expect(() => world.update()).not.toThrow();
  });
});
