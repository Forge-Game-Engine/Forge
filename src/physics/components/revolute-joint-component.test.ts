import { describe, expect, it } from 'vitest';
import {
  addRevoluteJointComponent,
  RevoluteJointId,
} from './revolute-joint-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { RevoluteJoint } from '../joints/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createJoint = (): RevoluteJoint =>
  new RevoluteJoint({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
  });

describe('addRevoluteJointComponent', () => {
  it('attaches a component with the given joint', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const joint = createJoint();

    addRevoluteJointComponent(world, entity, { joint });

    expect(world.getComponent(entity, RevoluteJointId)).toEqual({ joint });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const joint = createJoint();

    const component = addRevoluteJointComponent(world, entity, { joint });

    expect(world.getComponent(entity, RevoluteJointId)).toBe(component);
  });
});
