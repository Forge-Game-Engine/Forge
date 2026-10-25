import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  addTransformInterpolationComponent,
} from '../components/index.js';
import { createTransformInterpolationEcsSystem } from './transform-interpolation-system.js';

describe('createTransformInterpolationEcsSystem', () => {
  it("copies each interpolated entity's local transform into stepEnd, reusing its snapshot", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity);
    const rotation = addRotationComponent(world, entity);
    const scale = addScaleComponent(world, entity);
    const interpolation = addTransformInterpolationComponent(world, entity);
    const { stepEnd } = interpolation;
    const stepEndPosition = stepEnd.position;

    world.addSystem(createTransformInterpolationEcsSystem());

    position.local.x = 5;
    position.local.y = 6;
    rotation.local = 1.5;
    scale.local.x = 2;
    world.update();

    expect(interpolation.stepEnd).toBe(stepEnd);
    expect(stepEnd.position).toBe(stepEndPosition);
    expect(stepEnd).toEqual({
      position: { x: 5, y: 6 },
      rotation: 1.5,
      scale: { x: 2, y: 1 },
    });
    expect(interpolation.stepStart.position).toEqual({ x: 0, y: 0 });
  });

  it('leaves entities without the component alone', () => {
    const world = new EcsWorld();
    const interpolated = world.createEntity();
    const other = world.createEntity();
    const interpolatedPosition = addPositionComponent(world, interpolated);
    const interpolation = addTransformInterpolationComponent(
      world,
      interpolated,
    );
    const otherPosition = addPositionComponent(world, other);

    world.addSystem(createTransformInterpolationEcsSystem());

    interpolatedPosition.local.x = 1;
    otherPosition.local.x = 2;
    world.update();

    expect(interpolation.stepEnd.position.x).toBe(1);
    expect(otherPosition.world.x).toBe(0);
  });
});
