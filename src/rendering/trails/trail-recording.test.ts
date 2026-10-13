import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  addTrailComponent,
  TrailEcsComponent,
  TrailSettings,
} from './components/trail-component.js';
import { getTrailPointIndex, recordTrail } from './trail-recording.js';

/** The recorded points, oldest first. */
const readPoints = (
  trail: TrailEcsComponent,
): { x: number; y: number; time: number; distance: number; run: boolean }[] => {
  const { points } = trail.state;

  return Array.from({ length: points.count }, (_, i) => {
    const index = getTrailPointIndex(points, i);

    return {
      x: points.x[index],
      y: points.y[index],
      time: points.time[index],
      distance: points.distance[index],
      run: points.runStart[index] === 1,
    };
  });
};

describe('recordTrail', () => {
  let world: EcsWorld;

  const createTrail = (
    options: Partial<TrailSettings> = {},
  ): TrailEcsComponent =>
    addTrailComponent(world, world.createEntity(), {
      lifetimeSeconds: 1,
      minVertexDistance: 1,
      ...options,
    });

  beforeEach(() => {
    world = new EcsWorld();
  });

  it('records the first position as the start of a run', () => {
    const trail = createTrail();

    recordTrail(trail, 3, 4, 0.1);

    expect(readPoints(trail)).toEqual([
      { x: 3, y: 4, time: 0.1, distance: 0, run: true },
    ]);
  });

  it('records a point only once the entity is minVertexDistance from the newest', () => {
    const trail = createTrail();

    recordTrail(trail, 0, 0, 0.1);
    recordTrail(trail, 0.5, 0, 0.1);
    recordTrail(trail, 0.99, 0, 0.1);

    expect(readPoints(trail)).toHaveLength(1);

    recordTrail(trail, 1, 0, 0.1);

    expect(readPoints(trail)).toEqual([
      { x: 0, y: 0, time: 0.1, distance: 0, run: true },
      {
        x: 1,
        y: 0,
        time: expect.closeTo(0.4) as number,
        distance: 1,
        run: false,
      },
    ]);
  });

  it('keeps one expired point per run to cut the tail from, and drops the rest', () => {
    const trail = createTrail({ lifetimeSeconds: 0.55 });

    for (let x = 0; x <= 10; x++) {
      recordTrail(trail, x, 0, 0.1);
    }

    // Ages 1.0 down to 0: the newest point older than 0.55 is kept, at x 4.
    expect(readPoints(trail).map((point) => point.x)).toEqual([
      4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('ages nothing when game time is paused', () => {
    const trail = createTrail({ lifetimeSeconds: 0.5 });

    recordTrail(trail, 0, 0, 0.1);
    recordTrail(trail, 1, 0, 0.1);

    for (let frame = 0; frame < 100; frame++) {
      recordTrail(trail, 1, 0, 0);
    }

    expect(readPoints(trail)).toHaveLength(2);
    expect(trail.state.elapsedSeconds).toBeCloseTo(0.2);
  });

  it('records a final point where emission stopped, adds nothing after, and drops every point once expired', () => {
    const trail = createTrail({ lifetimeSeconds: 0.5 });

    recordTrail(trail, 0, 0, 0.1);
    recordTrail(trail, 1, 0, 0.1);
    trail.emitting = false;
    recordTrail(trail, 1.5, 0, 0.1);

    expect(readPoints(trail).map((point) => point.x)).toEqual([0, 1, 1.5]);

    recordTrail(trail, 5, 0, 0.1);

    expect(readPoints(trail).map((point) => point.x)).toEqual([0, 1, 1.5]);

    for (let frame = 0; frame < 5; frame++) {
      recordTrail(trail, 5, 0, 0.1);
    }

    expect(readPoints(trail)).toEqual([]);
  });

  it('starts a new run when emission comes back on, at the same distance', () => {
    const trail = createTrail({ lifetimeSeconds: 10 });

    recordTrail(trail, 0, 0, 0.1);
    recordTrail(trail, 2, 0, 0.1);
    trail.emitting = false;
    recordTrail(trail, 3, 0, 0.1);
    trail.emitting = true;
    recordTrail(trail, 10, 0, 0.1);
    recordTrail(trail, 12, 0, 0.1);

    expect(
      readPoints(trail).map(({ x, distance, run }) => ({ x, distance, run })),
    ).toEqual([
      { x: 0, distance: 0, run: true },
      { x: 2, distance: 2, run: false },
      { x: 3, distance: 3, run: false },
      { x: 10, distance: 3, run: true },
      { x: 12, distance: 5, run: false },
    ]);
  });

  it('empties the trail when clearRequests changes, starting again from the entity', () => {
    const trail = createTrail();

    recordTrail(trail, 0, 0, 0.1);
    recordTrail(trail, 5, 0, 0.1);
    trail.clearRequests++;
    recordTrail(trail, 100, 0, 0.1);

    expect(readPoints(trail)).toEqual([
      {
        x: 100,
        y: 0,
        time: expect.closeTo(0.3) as number,
        distance: 0,
        run: true,
      },
    ]);
    expect(trail.state.clearsApplied).toBe(1);
  });

  it('records no final point at a teleport when cleared while not emitting', () => {
    const trail = createTrail();

    recordTrail(trail, 0, 0, 0.1);
    trail.emitting = false;
    trail.clearRequests++;
    recordTrail(trail, 100, 0, 0.1);

    expect(readPoints(trail)).toEqual([]);
  });

  it('keeps the points in order when the ring buffer wraps and grows', () => {
    const trail = createTrail({ lifetimeSeconds: 0.05, minVertexDistance: 1 });
    const { points } = trail.state;
    const initialCapacity = points.capacity;

    // Wrap the buffer a few times at its starting size.
    for (let x = 0; x < initialCapacity * 3; x++) {
      recordTrail(trail, x, 0, 0.01);
    }

    expect(points.capacity).toBe(initialCapacity);

    trail.lifetimeSeconds = 100;

    for (let x = initialCapacity * 3; x < initialCapacity * 6; x++) {
      recordTrail(trail, x, 0, 0.01);
    }

    expect(points.capacity).toBeGreaterThan(initialCapacity);

    const xs = readPoints(trail).map((point) => point.x);

    expect(xs).toEqual(Array.from({ length: xs.length }, (_, i) => xs[0] + i));
    expect(xs[xs.length - 1]).toBe(initialCapacity * 6 - 1);
  });

  it('never grows at 60 frames a second', () => {
    const trail = createTrail({ lifetimeSeconds: 1, minVertexDistance: 0.01 });
    const { points } = trail.state;
    const { x } = points;

    for (let frame = 0; frame < 600; frame++) {
      recordTrail(trail, frame, 0, 1 / 60);
    }

    expect(points.x).toBe(x);
  });
});
