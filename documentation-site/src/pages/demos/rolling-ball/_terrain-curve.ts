import { Vector2 } from '@forge-game-engine/forge/math';

/** A point on a curve built by {@link buildTerrainCurve}. */
export interface TerrainCurvePoint {
  /** The point's local-space position. */
  position: Vector2;

  /** The cumulative arc length from the start of the curve to this point. */
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

  return b0
    .multiply(w0)
    .add(b1.multiply(w1))
    .add(b2.multiply(w2))
    .add(b3.multiply(w3));
}

/**
 * Builds a smooth curve through `controlPoints`, using a Catmull-Rom spline
 * (converted to an equivalent sequence of cubic Beziers, one per segment,
 * via the standard `Bn = Pn +/- (Pn+1 - Pn-1) / 6` tangent construction) so
 * the curve passes exactly through every control point with a continuous
 * tangent, rather than a straight-line polyline between them. Densely
 * sampling that curve is what turns a handful of sparse, randomly-placed
 * control points into the long, natural-looking rolling terrain silhouette,
 * both for {@link TerrainShape}'s collision points and for the render mesh.
 * @param controlPoints - The sparse anchor points the curve passes through,
 * ordered by strictly increasing x. Must contain at least 2 points.
 * @param samplesPerSegment - How many points to sample along each segment
 * between two consecutive control points.
 * @returns A dense polyline approximating the smooth curve, with each
 * point's cumulative arc length from the start.
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
    { position: controlPoints[0].clone(), distance: 0 },
  ];

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[i > 0 ? i - 1 : i];
    const p1 = controlPoints[i];
    const p2 = controlPoints[i + 1];
    const p3 = controlPoints[i < controlPoints.length - 2 ? i + 2 : i + 1];

    const b0 = p1;
    const b1 = p1.add(p2.subtract(p0).multiply(1 / 6));
    const b2 = p2.subtract(p3.subtract(p1).multiply(1 / 6));
    const b3 = p2;

    for (let sample = 1; sample <= samplesPerSegment; sample++) {
      const t = sample / samplesPerSegment;
      const position = sampleCubicBezier(b0, b1, b2, b3, t);
      const previous = curvePoints[curvePoints.length - 1];
      const distance =
        previous.distance + position.distanceTo(previous.position);

      curvePoints.push({ position, distance });
    }
  }

  return curvePoints;
}

/**
 * Finds the curve's surface height (local-space y) at a given local-space
 * x, linearly interpolating between the two bracketing sampled points.
 * `curvePoints` must be ordered by strictly increasing x (as returned by
 * {@link buildTerrainCurve}).
 * @param curvePoints - The dense curve to search.
 * @param localX - The local-space x to find the height at.
 * @returns The interpolated local-space y at `localX`.
 */
export function heightAtLocalX(
  curvePoints: readonly TerrainCurvePoint[],
  localX: number,
): number {
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
