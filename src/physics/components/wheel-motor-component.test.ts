import { describe, expect, it } from 'vitest';
import {
  addWheelMotorComponent,
  WheelMotorId,
} from './wheel-motor-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addWheelMotorComponent', () => {
  it('attaches a component with the given target angular velocity and max torque', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addWheelMotorComponent(world, entity, {
      targetAngularVelocity: 10,
      maxTorque: 5,
    });

    expect(world.getComponent(entity, WheelMotorId)).toEqual({
      targetAngularVelocity: 10,
      maxTorque: 5,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addWheelMotorComponent(world, entity, {
      targetAngularVelocity: 10,
      maxTorque: 5,
    });

    expect(world.getComponent(entity, WheelMotorId)).toBe(component);
  });
});
