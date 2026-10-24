import { describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { getJointBodyTransform, hasJointBody } from './has-joint-body.js';
import { resolveJointBody } from './resolve-joint-body.js';

describe('hasJointBody', () => {
  it('is true for an entity with a position and a rotation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity);
    const rotation = addRotationComponent(world, entity);

    expect(hasJointBody(world, entity)).toBe(true);
    expect(getJointBodyTransform(world, entity)).toEqual({
      position,
      rotation,
    });
  });

  it.each([
    ['its position', addRotationComponent],
    ['its rotation', addPositionComponent],
  ] as const)('is false for an entity missing %s', (_name, addOne) => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addOne(world, entity);

    expect(hasJointBody(world, entity)).toBe(false);
    expect(resolveJointBody(world, entity)).toBeNull();
  });

  it('is false for a removed entity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    world.removeEntity(entity);

    expect(hasJointBody(world, entity)).toBe(false);
  });
});
