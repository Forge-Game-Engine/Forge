import { describe, expect, it } from 'vitest';
import {
  addAngularVelocityMotorComponent,
  AngularVelocityMotorId,
} from './angular-velocity-motor-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addAngularVelocityMotorComponent', () => {
  it('attaches a component with the given options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAngularVelocityMotorComponent(world, entity, {
      targetVelocity: 4,
      maxTorque: 100,
    });

    expect(world.getComponent(entity, AngularVelocityMotorId)).toEqual({
      targetVelocity: 4,
      maxTorque: 100,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAngularVelocityMotorComponent(world, entity, {
      targetVelocity: -2,
      maxTorque: 50,
    });

    expect(component).toEqual({ targetVelocity: -2, maxTorque: 50 });
    expect(world.getComponent(entity, AngularVelocityMotorId)).toBe(component);
  });
});
