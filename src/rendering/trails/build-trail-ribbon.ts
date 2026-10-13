import {
  buildRibbonMesh,
  createRibbonMeshBuffers,
  RibbonMeshBuffers,
  RibbonMeshOptions,
} from '../geometry/build-ribbon-mesh.js';
import type {
  TrailEcsComponent,
  TrailRibbonPoint,
  TrailState,
} from './components/trail-component.js';
import { getTrailPointIndex } from './trail-recording.js';

/**
 * Turns sharper than about 151° are beveled, as SVG's and canvas's default
 * `miter-limit` of `4` does. Unity's trails don't expose it either.
 */
const trailMiterLimit = 4;

/** The entity a trail is drawn for: where it is, how it's turned and scaled. */
export interface TrailTransform {
  /** The entity's world x. */
  x: number;

  /** The entity's world y. */
  y: number;

  /** The entity's world rotation, in radians. */
  rotation: number;

  /** The entity's world scale on x. */
  scaleX: number;

  /** The entity's world scale on y. */
  scaleY: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/**
 * Appends the trail's next pooled ribbon point to the points being built,
 * creating it the first time the trail builds that many.
 * @param state - The trail's state.
 * @returns The point, to be filled in.
 */
function takeRibbonPoint(state: TrailState): TrailRibbonPoint {
  const { ribbonPoints, ribbonPointPool } = state;

  if (ribbonPoints.length === ribbonPointPool.length) {
    ribbonPointPool.push({
      position: { x: 0, y: 0 },
      width: 0,
      color: { r: 0, g: 0, b: 0, a: 0 },
      distance: 0,
    });
  }

  const point = ribbonPointPool[ribbonPoints.length];

  ribbonPoints.push(point);

  return point;
}

/**
 * Appends a ribbon point at a world position and age, with the width and
 * color for that age and its position relative to the entity.
 * @param trail - The trail.
 * @param transform - The entity's world transform.
 * @param x - The point's world x.
 * @param y - The point's world y.
 * @param age - The point's age, in seconds.
 * @param distance - How far along the trail the point is.
 */
function pushRibbonPoint(
  trail: TrailEcsComponent,
  transform: TrailTransform,
  x: number,
  y: number,
  age: number,
  distance: number,
): void {
  const point = takeRibbonPoint(trail.state);
  const t = clamp(age / trail.lifetimeSeconds, 0, 1);
  const widthT = trail.widthEasing(t);
  const colorT = trail.colorEasing(t);
  const { startColor, endColor } = trail;

  // Built around the entity, so the values stay small (and precise in a
  // Float32Array) however far from the origin the trail is.
  point.position.x = x - transform.x;
  point.position.y = y - transform.y;
  // Easing functions such as `easeInBack` overshoot `[0, 1]`: a width or a
  // color channel below `0` means nothing, and alpha stays in `[0, 1]`, as
  // `Color`'s constructor keeps it.
  point.width = Math.max(lerp(trail.startWidth, trail.endWidth, widthT), 0);
  point.color.r = Math.max(lerp(startColor.r, endColor.r, colorT), 0);
  point.color.g = Math.max(lerp(startColor.g, endColor.g, colorT), 0);
  point.color.b = Math.max(lerp(startColor.b, endColor.b, colorT), 0);
  point.color.a = clamp(lerp(startColor.a, endColor.a, colorT), 0, 1);
  point.distance = distance;
}

/**
 * Fills `state.ribbonPoints` with one run's points, oldest first: its tail
 * cut exactly at `lifetimeSeconds` between its one expired point and the
 * next, then its live points, then the entity itself when `withHead`.
 * @param trail - The trail.
 * @param transform - The entity's world transform.
 * @param first - The run's first point, from the oldest.
 * @param end - One past the run's last point.
 * @param withHead - Whether the run ends at the entity.
 */
function collectRun(
  trail: TrailEcsComponent,
  transform: TrailTransform,
  first: number,
  end: number,
  withHead: boolean,
): void {
  const { state } = trail;
  const { points, elapsedSeconds } = state;
  let anchor = -1;

  state.ribbonPoints.length = 0;

  for (let i = first; i < end; i++) {
    const index = getTrailPointIndex(points, i);

    anchor = addLinePoint(
      trail,
      transform,
      anchor,
      index,
      elapsedSeconds - points.time[index],
      points.distance[index],
    );
  }

  if (withHead) {
    const newest = getTrailPointIndex(points, end - 1);
    const gap = Math.hypot(
      transform.x - points.x[newest],
      transform.y - points.y[newest],
    );

    addLinePoint(
      trail,
      transform,
      anchor,
      -1,
      0,
      points.distance[newest] + gap,
    );
  }
}

/**
 * Adds one point of a run's line: a recorded point, or the entity itself
 * (the head, at age `0`). An expired point isn't drawn but becomes the
 * anchor the next live point cuts the tail from, at exactly
 * `lifetimeSeconds`.
 * @param trail - The trail.
 * @param transform - The entity's world transform.
 * @param anchor - The index of the run's expired point, or `-1`.
 * @param index - The point's index, or `-1` for the head.
 * @param age - The point's age, in seconds.
 * @param distance - How far along the trail the point is.
 * @returns The anchor for the next point.
 */
function addLinePoint(
  trail: TrailEcsComponent,
  transform: TrailTransform,
  anchor: number,
  index: number,
  age: number,
  distance: number,
): number {
  const { lifetimeSeconds } = trail;
  const { points, elapsedSeconds } = trail.state;

  if (age >= lifetimeSeconds) {
    return index;
  }

  const x = index === -1 ? transform.x : points.x[index];
  const y = index === -1 ? transform.y : points.y[index];

  if (anchor !== -1) {
    const anchorAge = elapsedSeconds - points.time[anchor];
    const f = (anchorAge - lifetimeSeconds) / (anchorAge - age);

    pushRibbonPoint(
      trail,
      transform,
      lerp(points.x[anchor], x, f),
      lerp(points.y[anchor], y, f),
      lifetimeSeconds,
      lerp(points.distance[anchor], distance, f),
    );
  }

  pushRibbonPoint(trail, transform, x, y, age, distance);

  return -1;
}

/**
 * Copies `count` vertices from `from` into `to` at `offset`, growing `to`
 * to a power of two vertices if it can't hold them.
 * @param to - The buffers to append to.
 * @param offset - The vertex to start writing at.
 * @param from - The buffers to copy from.
 * @param start - The first vertex to copy.
 * @param count - The number of vertices to copy.
 */
function copyVertices(
  to: RibbonMeshBuffers,
  offset: number,
  from: RibbonMeshBuffers,
  start: number,
  count: number,
): void {
  const needed = offset + count;

  if (to.positions.length < needed * 2) {
    const capacity = 2 ** Math.ceil(Math.log2(needed));
    const grown: RibbonMeshBuffers = {
      positions: new Float32Array(capacity * 2),
      uvs: new Float32Array(capacity * 2),
      colors: new Float32Array(capacity * 4),
    };

    grown.positions.set(to.positions.subarray(0, offset * 2));
    grown.uvs.set(to.uvs.subarray(0, offset * 2));
    grown.colors.set(to.colors.subarray(0, offset * 4));
    Object.assign(to, grown);
  }

  to.positions.set(
    from.positions.subarray(start * 2, (start + count) * 2),
    offset * 2,
  );
  to.uvs.set(from.uvs.subarray(start * 2, (start + count) * 2), offset * 2);
  to.colors.set(
    from.colors.subarray(start * 4, (start + count) * 4),
    offset * 4,
  );
}

/**
 * Maps the first `vertexCount` positions from world offsets around the
 * entity into its local space, undoing its world rotation and scale, which
 * the render system applies to every mesh vertex.
 * @param buffers - The buffers to map in place.
 * @param vertexCount - The number of vertices.
 * @param transform - The entity's world transform; its scale isn't `0`.
 */
function mapToLocalSpace(
  buffers: RibbonMeshBuffers,
  vertexCount: number,
  transform: TrailTransform,
): void {
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  const { positions } = buffers;

  for (let v = 0; v < vertexCount; v++) {
    const x = positions[v * 2];
    const y = positions[v * 2 + 1];

    positions[v * 2] = (cos * x - sin * y) / transform.scaleX;
    positions[v * 2 + 1] = (sin * x + cos * y) / transform.scaleY;
  }
}

/**
 * Returns the index, from the oldest, of the first point after `first`
 * that starts a run, or the point count if none does.
 * @param trail - The trail.
 * @param first - The first point of the current run.
 * @returns One past the run's last point.
 */
function getRunEnd(trail: TrailEcsComponent, first: number): number {
  const { points } = trail.state;
  let end = first + 1;

  while (
    end < points.count &&
    points.runStart[getTrailPointIndex(points, end)] === 0
  ) {
    end++;
  }

  return end;
}

/**
 * Builds a trail's ribbon into `trail.state.buffers`, as one triangle strip
 * in its entity's local space: each run of points (oldest first, ending at
 * the entity while the trail emits) with widths and colors from their age,
 * cut at `lifetimeSeconds`, and runs joined by two repeated vertices, which
 * make zero-area triangles across the gap between them.
 * @param trail - The trail, recorded this frame.
 * @param transform - The entity's world transform.
 * @returns The number of vertices built; `0` when there's nothing to draw,
 * or the entity's world scale is `0` on either axis.
 */
export function buildTrailRibbon(
  trail: TrailEcsComponent,
  transform: TrailTransform,
): number {
  const { state } = trail;
  const { points } = state;

  if (transform.scaleX === 0 || transform.scaleY === 0) {
    return 0;
  }

  const options: RibbonMeshOptions =
    trail.textureMode === 'tile'
      ? {
          textureMode: 'tile',
          tileLength: trail.tileLength,
          miterLimit: trailMiterLimit,
        }
      : { textureMode: 'stretch', miterLimit: trailMiterLimit };

  let vertexCount = 0;
  let first = 0;

  while (first < points.count) {
    const end = getRunEnd(trail, first);
    const isCurrentRun = end === points.count;
    const isOnlyRun = first === 0 && isCurrentRun;

    collectRun(trail, transform, first, end, isCurrentRun && trail.emitting);

    if (isOnlyRun) {
      vertexCount = buildRibbonMesh(state.ribbonPoints, options, state.buffers);

      break;
    }

    state.runBuffers ??= createRibbonMeshBuffers(2);

    const runVertexCount = buildRibbonMesh(
      state.ribbonPoints,
      options,
      state.runBuffers,
    );

    if (runVertexCount > 0) {
      if (vertexCount > 0) {
        // The previous run's last vertex and this run's first, repeated,
        // so the triangles across the gap have no area.
        copyVertices(
          state.buffers,
          vertexCount,
          state.buffers,
          vertexCount - 1,
          1,
        );
        copyVertices(state.buffers, vertexCount + 1, state.runBuffers, 0, 1);
        vertexCount += 2;
      }

      copyVertices(
        state.buffers,
        vertexCount,
        state.runBuffers,
        0,
        runVertexCount,
      );
      vertexCount += runVertexCount;
    }

    first = end;
  }

  state.ribbonPoints.length = 0;
  mapToLocalSpace(state.buffers, vertexCount, transform);

  return vertexCount;
}
