import { describe, expect, it } from 'vitest';
import {
  addLinearDamperComponent,
  LinearDamperId,
} from './linear-damper-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('addLinearDamperComponent', () => {
  it('attaches a component with the given bodies and dampingCoefficient', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const bodyA = createBody();
    const bodyB = createBody(new Vector2(2, 0));

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    const component = world.getComponent(entity, LinearDamperId);

    expect(component?.bodyA).toBe(bodyA);
    expect(component?.bodyB).toBe(bodyB);
    expect(component?.dampingCoefficient).toBe(1);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearDamperComponent(world, entity, {
      bodyA: createBody(),
      bodyB: createBody(new Vector2(2, 0)),
      dampingCoefficient: 1,
    });

    expect(world.getComponent(entity, LinearDamperId)).toBe(component);
  });

  it('defaults to zero-offset anchors', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addLinearDamperComponent(world, entity, {
      bodyA: createBody(),
      bodyB: createBody(),
      dampingCoefficient: 1,
    });

    expect(component.anchorA.equals(Vector2.zero)).toBe(true);
    expect(component.anchorB.equals(Vector2.zero)).toBe(true);
  });

  it('throws when dampingCoefficient is negative', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addLinearDamperComponent(world, entity, {
        bodyA: createBody(),
        bodyB: createBody(),
        dampingCoefficient: -1,
      }),
    ).toThrow();
  });
});
