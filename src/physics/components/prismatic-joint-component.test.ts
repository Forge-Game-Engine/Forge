import { describe, expect, it } from 'vitest';
import {
  addPrismaticJointComponent,
  PrismaticJointId,
} from './prismatic-joint-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { PrismaticJoint } from '../joints/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createJoint = (): PrismaticJoint =>
  new PrismaticJoint({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
  });

describe('addPrismaticJointComponent', () => {
  it('attaches a component with the given joint', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const joint = createJoint();

    addPrismaticJointComponent(world, entity, { joint });

    expect(world.getComponent(entity, PrismaticJointId)).toEqual({ joint });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const joint = createJoint();

    const component = addPrismaticJointComponent(world, entity, { joint });

    expect(world.getComponent(entity, PrismaticJointId)).toBe(component);
  });
});
