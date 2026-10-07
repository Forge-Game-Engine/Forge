import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRigidBodyMassData,
  getWorldCenterOfMass,
} from './rigid-body-mass-data.js';
import { EcsWorld } from '../ecs/index.js';
import { PolygonCollider } from './colliders/index.js';
import {
  addColliderComponent,
  addRigidBodyComponent,
  rigidBodyId,
  RigidBodyType,
} from './components/index.js';

describe('getRigidBodyMassData', () => {
  let world: EcsWorld;
  // A 2x1 box whose centroid is at (3, 0), off the entity's origin.
  let collider: PolygonCollider;

  beforeEach(() => {
    world = new EcsWorld();
    collider = new PolygonCollider([
      { x: 2, y: -0.5 },
      { x: 4, y: -0.5 },
      { x: 4, y: 0.5 },
      { x: 2, y: 0.5 },
    ]);
  });

  function createBody(type: RigidBodyType): number {
    const entity = world.createEntity();

    addColliderComponent(world, entity, { collider });
    addRigidBodyComponent(world, entity, { type });

    return entity;
  }

  it('returns zero inverse mass and the origin for an entity with no rigid body', () => {
    const entity = world.createEntity();

    expect(getRigidBodyMassData(world, entity)).toEqual({
      rigidBody: null,
      invMass: 0,
      invInertia: 0,
      localCenterOfMass: { x: 0, y: 0 },
    });
  });

  it("takes a dynamic body's mass data from its collider", () => {
    const entity = createBody('dynamic');
    const massData = getRigidBodyMassData(world, entity);

    expect(massData.invMass).toBeCloseTo(1 / collider.mass);
    expect(massData.invInertia).toBeCloseTo(1 / collider.momentOfInertia);
    expect(massData.localCenterOfMass.x).toBeCloseTo(3);
    expect(massData.localCenterOfMass.y).toBeCloseTo(0);
  });

  it.each(['static', 'kinematic'] as const)(
    'returns zero inverse mass and the origin for a %s body',
    (type) => {
      const entity = createBody(type);
      const massData = getRigidBodyMassData(world, entity);

      expect(massData.invMass).toBe(0);
      expect(massData.invInertia).toBe(0);
      expect(massData.localCenterOfMass).toEqual({ x: 0, y: 0 });
    },
  );

  it("follows a runtime change of the body's type", () => {
    const entity = createBody('kinematic');

    world.getComponent(entity, rigidBodyId)!.type = 'dynamic';

    expect(getRigidBodyMassData(world, entity).localCenterOfMass.x).toBeCloseTo(
      3,
    );
  });

  it('throws for a dynamic body with no collider', () => {
    const entity = world.createEntity();

    addRigidBodyComponent(world, entity);

    expect(() => getRigidBodyMassData(world, entity)).toThrow(
      /has no ColliderEcsComponent/,
    );
  });
});

describe('getWorldCenterOfMass', () => {
  it('rotates the local center by the rotation and adds the position', () => {
    const center = getWorldCenterOfMass({ x: 10, y: 5 }, Math.PI / 2, {
      x: 3,
      y: 0,
    });

    expect(center.x).toBeCloseTo(10);
    expect(center.y).toBeCloseTo(8);
  });

  it('does not mutate its arguments', () => {
    const position = { x: 1, y: 2 };
    const localCenter = { x: 3, y: 4 };

    getWorldCenterOfMass(position, 1, localCenter);

    expect(position).toEqual({ x: 1, y: 2 });
    expect(localCenter).toEqual({ x: 3, y: 4 });
  });
});
