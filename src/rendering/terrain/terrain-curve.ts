import {
  Vector2,
  vector2Add,
  vector2Clone,
  vector2DistanceTo,
  vector2Multiply,
  vector2Subtract,
} from '../../math/index.js';

/**
 * A point on a curve built by {@link buildTerrainCurve}.
 */
export interface TerrainCurvePoint {
  /**
   * The point's local-space position.
   */
  position: Vector2;

  /**
   * The cumulative arc length from the start of the curve to this point.
   */
  distance: number;
}

function sampleCubicBezier(
  b0: Vector2,
  b1: Vector2,
  b2: Vector2,
  b3: Vector2,
  t: number,
): Vector2 {
  const oneMinusT = 1 - t;
  const w0 = oneMinusT * oneMinusT * oneMinusT;
  const w1 = 3 * oneMinusT * oneMinusT * t;
  const w2 = 3 * oneMinusT * t * t;
  const w3 = t * t * t;

  // Clone before scaling: `b0`-`b3` are reused for every sample along this
  // segment, and `b0`/`b3` alias the caller's own control points.
  const result = vector2Multiply(vector2Clone(b0), w0);

  vector2Add(result, vector2Multiply(vector2Clone(b1), w1));
  vector2Add(result, vector2Multiply(vector2Clone(b2), w2));
  vector2Add(result, vector2Multiply(vector2Clone(b3), w3));

  return result;
}

/**
 * Builds a smooth curve through `controlPoints`, using a Catmull-Rom spline
 * (converted to an equivalent sequence of cubic Beziers, one per segment,
 * via the standard `Bn = Pn +/- (Pn+1 - Pn-1) / 6` tangent construction) so
 * the curve passes exactly through every control point with a continuous
 * tangent, rather than a straight-line polyline between them. Densely
 * sampling that curve turns a handful of sparse control points into a long,
 * natural-looking silhouette suitable for both a `TerrainShape`'s collision
 * points and a matching render mesh (see `createTerrainMesh`) - the same
 * points can drive both, so what's drawn always matches what's touched.
 * @param controlPoints - The sparse anchor points the curve passes through,
 * ordered by strictly increasing x. Must contain at least 2 points.
 * @param samplesPerSegment - How many points to sample along each segment
 * between two consecutive control points.
 * @returns A dense polyline approximating the smooth curve, with each
 * point's cumulative arc length from the start.
 * @throws An error if fewer than 2 control points are provided.
 */
export function buildTerrainCurve(
  controlPoints: readonly Vector2[],
  samplesPerSegment: number,
): TerrainCurvePoint[] {
  if (controlPoints.length < 2) {
    throw new Error(
      `buildTerrainCurve requires at least 2 control points, received ${controlPoints.length}.`,
    );
  }

  const curvePoints: TerrainCurvePoint[] = [
    { position: vector2Clone(controlPoints[0]), distance: 0 },
  ];

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[i > 0 ? i - 1 : i];
    const p1 = controlPoints[i];
    const p2 = controlPoints[i + 1];
    const p3 = controlPoints[i < controlPoints.length - 2 ? i + 2 : i + 1];

    // Clone before subtracting/adding throughout: `p0`-`p3` are the caller's
    // own control points, each reused across multiple segments.
    const b0 = p1;
    const b1 = vector2Add(
      vector2Clone(p1),
      vector2Multiply(vector2Subtract(vector2Clone(p2), p0), 1 / 6),
    );
    const b2 = vector2Subtract(
      vector2Clone(p2),
      vector2Multiply(vector2Subtract(vector2Clone(p3), p1), 1 / 6),
    );
    const b3 = p2;

    for (let sample = 1; sample <= samplesPerSegment; sample++) {
      const t = sample / samplesPerSegment;
      const position = sampleCubicBezier(b0, b1, b2, b3, t);
      const previous = curvePoints[curvePoints.length - 1];
      const distance =
        previous.distance + vector2DistanceTo(position, previous.position);

      curvePoints.push({ position, distance });
    }
  }

  return curvePoints;
}

/**
 * Finds a curve's surface height (local-space y) at a given local-space x,
 * linearly interpolating between the two bracketing sampled points.
 * `curvePoints` must be ordered by strictly increasing x (as returned by
 * {@link buildTerrainCurve}).
 * @param curvePoints - The dense curve to search. Must contain at least 1 point.
 * @param localX - The local-space x to find the height at.
 * @returns The interpolated local-space y at `localX`.
 * @throws An error if `curvePoints` is empty.
 */
export function heightAtLocalX(
  curvePoints: readonly TerrainCurvePoint[],
  localX: number,
): number {
  if (curvePoints.length === 0) {
    throw new Error('heightAtLocalX requires at least 1 curve point.');
  }

  const first = curvePoints[0];
  const last = curvePoints[curvePoints.length - 1];

  if (localX <= first.position.x) {
    return first.position.y;
  }

  if (localX >= last.position.x) {
    return last.position.y;
  }

  let low = 0;
  let high = curvePoints.length - 1;

  while (high - low > 1) {
    const mid = (low + high) >> 1;

    if (curvePoints[mid].position.x <= localX) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const a = curvePoints[low];
  const b = curvePoints[high];
  const t = (localX - a.position.x) / (b.position.x - a.position.x);

  return a.position.y + (b.position.y - a.position.y) * t;
}
