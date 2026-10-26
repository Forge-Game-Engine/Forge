import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { addPositionComponent } from './position-component.js';
import { addRotationComponent } from './rotation-component.js';
import { addScaleComponent } from './scale-component.js';
import {
  addTransformInterpolationComponent,
  transformInterpolationId,
} from './transform-interpolation-component.js';

describe('addTransformInterpolationComponent', () => {
  it("starts both snapshots as copies of the entity's local transform", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 3, y: 4 },
    });
    const rotation = addRotationComponent(world, entity, { local: 0.5 });
    const scale = addScaleComponent(world, entity, { local: { x: 2, y: 3 } });

    const component = addTransformInterpolationComponent(world, entity);
    const expected = {
      position: { x: 3, y: 4 },
      rotation: 0.5,
      scale: { x: 2, y: 3 },
    };

    expect(component.stepStart).toEqual(expected);
    expect(component.stepEnd).toEqual(expected);

    position.local.x = 100;
    rotation.local = 1;
    scale.local.x = 5;

    expect(component.stepStart).toEqual(expected);
    expect(component.stepEnd).toEqual(expected);
    expect(component.stepStart.position).not.toBe(component.stepEnd.position);
  });

  it('starts at the identity values for transform components the entity lacks', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addTransformInterpolationComponent(world, entity);
    const identity = {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    };

    expect(component.stepStart).toEqual(identity);
    expect(component.stepEnd).toEqual(identity);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addTransformInterpolationComponent(world, entity);

    expect(world.getComponent(entity, transformInterpolationId)).toBe(
      component,
    );
  });
});
