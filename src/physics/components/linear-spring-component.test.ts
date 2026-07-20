import { describe, expect, it } from 'vitest';
import {
  addLinearSpringComponent,
  LinearSpringId,
} from './linear-spring-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { LinearSpring } from '../forces/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createSpring = (): LinearSpring =>
  new LinearSpring({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
    stiffness: 10,
  });

describe('addLinearSpringComponent', () => {
  it('attaches a component with the given spring', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const spring = createSpring();

    addLinearSpringComponent(world, entity, { spring });

    expect(world.getComponent(entity, LinearSpringId)).toEqual({ spring });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const spring = createSpring();

    const component = addLinearSpringComponent(world, entity, { spring });

    expect(world.getComponent(entity, LinearSpringId)).toBe(component);
  });
});
