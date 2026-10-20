import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  positionId,
} from '../components/index.js';
import { createTransformEcsSystem } from '../systems/transform-system.js';
import { localToWorldPoint } from './local-to-world-point.js';
import { worldToLocalPoint } from './world-to-local-point.js';

describe('localToWorldPoint and worldToLocalPoint', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTransformEcsSystem());
  });

  it('map a point through position alone', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 10, y: -4 } });

    expect(localToWorldPoint(world, entity, { x: 1, y: 2 })).toEqual({
      x: 11,
      y: -2,
    });
    expect(worldToLocalPoint(world, entity, { x: 11, y: -2 })).toEqual({
      x: 1,
      y: 2,
    });
  });

  it('agree with where the transform system places a child', () => {
    const root = world.createEntity();
    const parent = world.createEntity();
    const child = world.createEntity();
    const childLocal = { x: 7, y: -3 };

    addPositionComponent(world, root, { local: { x: 50, y: 20 } });
    addRotationComponent(world, root, { local: -0.4 });
    addPositionComponent(world, parent, { local: { x: -6, y: 9 } });
    addRotationComponent(world, parent, { local: 1.1 });
    addScaleComponent(world, parent, { local: { x: 3, y: 0.5 } });
    addPositionComponent(world, child, { local: childLocal });
    world.setParent(parent, root);
    world.setParent(child, parent);
    world.update();

    const childWorld = world.getComponentRequired(child, positionId).world;
    const mapped = localToWorldPoint(world, parent, childLocal);
    const back = worldToLocalPoint(world, parent, childWorld);

    expect(mapped.x).toBeCloseTo(childWorld.x);
    expect(mapped.y).toBeCloseTo(childWorld.y);
    expect(back.x).toBeCloseTo(childLocal.x);
    expect(back.y).toBeCloseTo(childLocal.y);
  });

  it('invert each other on a rotated, scaled entity', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: -20, y: 35 } });
    addRotationComponent(world, entity, { local: 2.5 });
    addScaleComponent(world, entity, { local: { x: -1.5, y: 4 } });
    world.update();

    for (const point of [
      { x: 0, y: 0 },
      { x: 12.5, y: -8 },
      { x: -300, y: 41 },
    ]) {
      const there = localToWorldPoint(world, entity, point);
      const back = worldToLocalPoint(world, entity, there);

      expect(back.x).toBeCloseTo(point.x);
      expect(back.y).toBeCloseTo(point.y);
    }
  });

  it('read the world transform from the last transform pass', () => {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 1, y: 1 },
    });

    world.update();
    position.local.x = 100;

    expect(localToWorldPoint(world, entity, { x: 0, y: 0 })).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('return a new vector without changing the point', () => {
    const entity = world.createEntity();
    const point = { x: 3, y: 4 };

    addPositionComponent(world, entity, { local: { x: 1, y: 1 } });

    expect(localToWorldPoint(world, entity, point)).not.toBe(point);
    expect(worldToLocalPoint(world, entity, point)).not.toBe(point);
    expect(point).toEqual({ x: 3, y: 4 });
  });

  it('throw for an entity with no position', () => {
    const entity = world.createEntity();

    expect(() => localToWorldPoint(world, entity, { x: 0, y: 0 })).toThrow(
      /has no PositionEcsComponent/,
    );
    expect(() => worldToLocalPoint(world, entity, { x: 0, y: 0 })).toThrow(
      /has no PositionEcsComponent/,
    );
  });

  it('worldToLocalPoint throws for a zero world scale', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addScaleComponent(world, entity, { local: { x: 0, y: 1 } });

    expect(() => worldToLocalPoint(world, entity, { x: 0, y: 0 })).toThrow(
      /is 0 on an axis/,
    );
  });
});
