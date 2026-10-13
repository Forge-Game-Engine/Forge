import type {
  TrailEcsComponent,
  TrailPoints,
} from './components/trail-component.js';

/**
 * The frame rate a trail's point buffer is first sized for: at most one
 * point is recorded a frame, so at this rate it never has to grow.
 */
const initialFramesPerSecond = 60;

/**
 * A point recorded when emission stops is skipped when it's closer than
 * this to the newest point, the distance `buildRibbonMesh` treats as the
 * same point.
 */
const minFinalPointSpacing = 1e-4;

/**
 * Returns the number of points a new trail's buffer holds: the next power
 * of two above the points it records in `lifetimeSeconds` at 60 frames a
 * second, plus the head and the tail's anchor.
 * @param lifetimeSeconds - The trail's lifetime.
 * @returns The capacity, a power of two.
 */
export function getInitialTrailPointCapacity(lifetimeSeconds: number): number {
  const points = Math.ceil(lifetimeSeconds * initialFramesPerSecond) + 2;

  return 2 ** Math.ceil(Math.log2(points));
}

/**
 * Creates an empty point buffer.
 * @param capacity - The number of points it holds, a power of two.
 * @returns The buffer.
 */
export function createTrailPoints(capacity: number): TrailPoints {
  return {
    capacity,
    start: 0,
    count: 0,
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    time: new Float64Array(capacity),
    distance: new Float64Array(capacity),
    runStart: new Uint8Array(capacity),
  };
}

/**
 * Returns the array index of the `i`-th point from the oldest.
 * @param points - The point buffer.
 * @param i - The point's place from the oldest, `0` to `count - 1`.
 * @returns Its index in the buffer's arrays.
 */
export function getTrailPointIndex(points: TrailPoints, i: number): number {
  // `capacity` is a power of two, so this is `% capacity`.
  return (points.start + i) & (points.capacity - 1);
}

/**
 * Doubles a full buffer's capacity, copying its points in order to the
 * start of the new arrays.
 * @param points - The point buffer.
 */
function growTrailPoints(points: TrailPoints): void {
  const grown = createTrailPoints(points.capacity * 2);

  for (let i = 0; i < points.count; i++) {
    const index = getTrailPointIndex(points, i);

    grown.x[i] = points.x[index];
    grown.y[i] = points.y[index];
    grown.time[i] = points.time[index];
    grown.distance[i] = points.distance[index];
    grown.runStart[i] = points.runStart[index];
  }

  points.capacity = grown.capacity;
  points.start = 0;
  points.x = grown.x;
  points.y = grown.y;
  points.time = grown.time;
  points.distance = grown.distance;
  points.runStart = grown.runStart;
}

/**
 * Records a point after the newest one, growing the buffer if it's full.
 * Its distance is the newest point's plus the gap between them, or the
 * newest point's unchanged when it starts a run (nothing is drawn across
 * the gap between runs).
 * @param points - The point buffer.
 * @param x - The point's world x.
 * @param y - The point's world y.
 * @param time - The trail's `elapsedSeconds`.
 * @param startsRun - Whether it starts a new piece of trail.
 */
function pushTrailPoint(
  points: TrailPoints,
  x: number,
  y: number,
  time: number,
  startsRun: boolean,
): void {
  let distance = 0;

  if (points.count > 0) {
    const newest = getTrailPointIndex(points, points.count - 1);

    distance = points.distance[newest];

    if (!startsRun) {
      distance += Math.hypot(x - points.x[newest], y - points.y[newest]);
    }
  }

  if (points.count === points.capacity) {
    growTrailPoints(points);
  }

  const index = getTrailPointIndex(points, points.count);

  points.x[index] = x;
  points.y[index] = y;
  points.time[index] = time;
  points.distance[index] = distance;
  points.runStart[index] = startsRun ? 1 : 0;
  points.count++;
}

/**
 * Returns how far `(x, y)` is from the newest point.
 * @param points - A point buffer with at least one point.
 * @param x - The world x.
 * @param y - The world y.
 * @returns The distance, in world units.
 */
function distanceFromNewest(points: TrailPoints, x: number, y: number): number {
  const newest = getTrailPointIndex(points, points.count - 1);

  return Math.hypot(x - points.x[newest], y - points.y[newest]);
}

/**
 * Returns whether the oldest point can be dropped: it's at least
 * `lifetimeSeconds` old, and so is whatever comes after it in its run (the
 * next point, or the entity itself, which is never old, while the trail
 * emits). So each run keeps at most one expired point, to cut its tail at
 * exactly `lifetimeSeconds` from.
 * @param trail - The trail.
 * @returns `true` if the oldest point can go.
 */
function canDropOldest(trail: TrailEcsComponent): boolean {
  const { points, elapsedSeconds } = trail.state;
  const oldest = getTrailPointIndex(points, 0);

  if (elapsedSeconds - points.time[oldest] < trail.lifetimeSeconds) {
    return false;
  }

  if (points.count === 1) {
    // Its run is the newest: the entity is next while the trail emits.
    return !trail.emitting;
  }

  const next = getTrailPointIndex(points, 1);

  // The next point starts another run, so this run has nothing left.
  if (points.runStart[next] === 1) {
    return true;
  }

  return elapsedSeconds - points.time[next] >= trail.lifetimeSeconds;
}

/**
 * Advances a trail by one frame: ages it by `deltaSeconds`, carries out a
 * `clearTrail`, records the entity's position if it's far enough from the
 * newest point (or emission has just started or stopped), and drops the
 * points that have expired.
 * @param trail - The trail.
 * @param x - The entity's world x.
 * @param y - The entity's world y.
 * @param deltaSeconds - The game time since the last frame.
 */
export function recordTrail(
  trail: TrailEcsComponent,
  x: number,
  y: number,
  deltaSeconds: number,
): void {
  const { state } = trail;
  const { points } = state;

  state.elapsedSeconds += deltaSeconds;

  if (trail.clearRequests !== state.clearsApplied) {
    points.start = 0;
    points.count = 0;
    state.clearsApplied = trail.clearRequests;
    // So a cleared trail starts a new run, and one that isn't emitting
    // records no final point at wherever the entity was moved to.
    state.wasEmitting = false;
  }

  if (trail.emitting) {
    if (points.count === 0 || !state.wasEmitting) {
      pushTrailPoint(points, x, y, state.elapsedSeconds, true);
    } else if (distanceFromNewest(points, x, y) >= trail.minVertexDistance) {
      pushTrailPoint(points, x, y, state.elapsedSeconds, false);
    }
  } else if (
    state.wasEmitting &&
    points.count > 0 &&
    distanceFromNewest(points, x, y) > minFinalPointSpacing
  ) {
    // The trail ends where the entity was when emission stopped.
    pushTrailPoint(points, x, y, state.elapsedSeconds, false);
  }

  state.wasEmitting = trail.emitting;

  while (points.count > 0 && canDropOldest(trail)) {
    points.start = getTrailPointIndex(points, 1);
    points.count--;
  }
}
