import { describe, expect, it } from 'vitest';
import {
  addAppliedTorqueComponent,
  AppliedTorqueId,
} from './applied-torque-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addAppliedTorqueComponent', () => {
  it('attaches a component with a default value of 0', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAppliedTorqueComponent(world, entity);

    expect(world.getComponent(entity, AppliedTorqueId)).toEqual({
      value: 0,
    });
  });

  it('applies the provided value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAppliedTorqueComponent(world, entity, { value: 25 });

    expect(world.getComponent(entity, AppliedTorqueId)).toEqual({
      value: 25,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAppliedTorqueComponent(world, entity, {
      value: 10,
    });

    expect(component).toEqual({ value: 10 });
    expect(world.getComponent(entity, AppliedTorqueId)).toBe(component);
  });
});
