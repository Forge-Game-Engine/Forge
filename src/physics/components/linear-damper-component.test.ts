import { describe, expect, it } from 'vitest';
import {
  addLinearDamperComponent,
  LinearDamperId,
} from './linear-damper-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { LinearDamper } from '../forces/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/circle-shape.js';

const createDamper = (): LinearDamper =>
  new LinearDamper({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
    dampingCoefficient: 1,
  });

describe('addLinearDamperComponent', () => {
  it('attaches a component with the given damper', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const damper = createDamper();

    addLinearDamperComponent(world, entity, { damper });

    expect(world.getComponent(entity, LinearDamperId)).toEqual({ damper });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const damper = createDamper();

    const component = addLinearDamperComponent(world, entity, { damper });

    expect(world.getComponent(entity, LinearDamperId)).toBe(component);
  });
});
