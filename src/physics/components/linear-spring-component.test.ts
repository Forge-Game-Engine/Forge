import { describe, expect, it } from 'vitest';
import {
  addLinearSpringComponent,
  LinearSpringId,
} from './linear-spring-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('addLinearSpringComponent', () => {
  it('attaches a component with the given bodies and stiffness', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const bodyA = createBody();
    const bodyB = createBody(new Vector2(2, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      stiffness: 10,
    });

    const component = world.getComponent(entity, LinearSpringId);

    expect(component?.bodyA).toBe(bodyA);
    expect(component?.bodyB).toBe(bodyB);
    expect(component?.stiffness).toBe(10);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearSpringComponent(world, entity, {
      bodyA: createBody(),
      bodyB: createBody(new Vector2(2, 0)),
      stiffness: 10,
    });

    expect(world.getComponent(entity, LinearSpringId)).toBe(component);
  });

  it('defaults restLength to the distance between anchors at attach time', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearSpringComponent(world, entity, {
      bodyA: createBody(Vector2.zero),
      bodyB: createBody(new Vector2(5, 0)),
      stiffness: 10,
    });

    expect(component.restLength).toBeCloseTo(5);
  });

  it('uses an explicit restLength when given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearSpringComponent(world, entity, {
      bodyA: createBody(Vector2.zero),
      bodyB: createBody(new Vector2(5, 0)),
      stiffness: 10,
      restLength: 2,
    });

    expect(component.restLength).toBe(2);
  });

  it('defaults to zero-offset anchors', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearSpringComponent(world, entity, {
      bodyA: createBody(),
      bodyB: createBody(),
      stiffness: 10,
    });

    expect(component.anchorA.equals(Vector2.zero)).toBe(true);
    expect(component.anchorB.equals(Vector2.zero)).toBe(true);
  });

  it('throws when stiffness is negative', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addLinearSpringComponent(world, entity, {
        bodyA: createBody(),
        bodyB: createBody(),
        stiffness: -1,
      }),
    ).toThrow();
  });
});
