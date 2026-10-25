import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  addTransformInterpolationComponent,
  positionId,
} from '../components/index.js';
import { Time } from '../time/index.js';
import {
  getInterpolatedLocalPosition,
  getInterpolatedLocalRotation,
} from './get-interpolated-local-transform.js';

const fixedDeltaMilliseconds = 1000 / 32;

// A world and a time whose overstep fraction is 0.5, with an entity whose
// latest step took it from (0, 0) and rotation 0 to (16, 8) and rotation 1.
function createScene(): {
  world: EcsWorld;
  time: Time;
  entity: number;
} {
  const world = new EcsWorld();
  const time = new Time();
  const entity = world.createEntity();

  time.fixedDeltaTimeInMilliseconds = fixedDeltaMilliseconds;
  time.update(0);
  time.update(fixedDeltaMilliseconds / 2);

  addPositionComponent(world, entity, { local: { x: 16, y: 8 } });
  addRotationComponent(world, entity, { local: 1 });

  const interpolation = addTransformInterpolationComponent(world, entity);

  interpolation.stepStart.position.x = 0;
  interpolation.stepStart.position.y = 0;
  interpolation.stepStart.rotation = 0;

  return { world, time, entity };
}

describe('getInterpolatedLocalPosition', () => {
  it('returns the blend the frame pass draws', () => {
    const { world, time, entity } = createScene();

    expect(getInterpolatedLocalPosition(world, entity, time)).toEqual({
      x: 8,
      y: 4,
    });
  });

  it('returns local for an entity moved since the latest step', () => {
    const { world, time, entity } = createScene();
    const position = world.getComponent(entity, positionId);

    if (!position) {
      throw new Error('The scene has no position.');
    }

    position.local.x = 100;

    expect(getInterpolatedLocalPosition(world, entity, time)).toEqual({
      x: 100,
      y: 8,
    });
  });

  it('returns local for an entity without the component', () => {
    const world = new EcsWorld();
    const time = new Time();
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 3, y: 4 } });

    expect(getInterpolatedLocalPosition(world, entity, time)).toEqual({
      x: 3,
      y: 4,
    });
  });

  it('returns local inside a fixed step', () => {
    const { world, time, entity } = createScene();

    time.update(fixedDeltaMilliseconds * 2);
    expect(time.consumeFixedStep()).toBe(true);

    expect(getInterpolatedLocalPosition(world, entity, time)).toEqual({
      x: 16,
      y: 8,
    });
  });

  it('returns a new vector', () => {
    const world = new EcsWorld();
    const time = new Time();
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity);

    const result = getInterpolatedLocalPosition(world, entity, time);

    expect(result).not.toBe(position.local);
  });

  it('throws for an entity without a position', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      getInterpolatedLocalPosition(world, entity, new Time()),
    ).toThrow(/no PositionEcsComponent/);
  });
});

describe('getInterpolatedLocalRotation', () => {
  it('returns the blend the frame pass draws', () => {
    const { world, time, entity } = createScene();

    expect(getInterpolatedLocalRotation(world, entity, time)).toBeCloseTo(0.5);
  });

  it('returns 0 for an entity without a rotation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addPositionComponent(world, entity);

    expect(getInterpolatedLocalRotation(world, entity, new Time())).toBe(0);
  });
});
