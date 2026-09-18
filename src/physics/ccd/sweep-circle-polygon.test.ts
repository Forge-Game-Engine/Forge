import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCirclePolygon } from './sweep-circle-polygon.js';

function square(): PolygonCollider {
  return new PolygonCollider([
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ]);
}

function movingCircleBody(radius: number): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation: 0,
    collider: new CircleCollider(radius),
  };
}

function staticPolygonBody(collider: PolygonCollider): CollisionBody {
  return { position: { x: 0, y: 0 }, rotation: 0, collider };
}

describe('sweepCirclePolygon', () => {
  it('returns null when the swept circle never reaches the polygon', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 5 },
      { x: 0, y: 5 },
    );

    expect(hit).toBeNull();
  });

  it('finds the earliest time of impact against a face', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    // The circle (radius 1) first touches the face (at x=-1) once its
    // center reaches x=-2, 8 units into the 10-unit swept translation.
    expect(hit?.t).toBeCloseTo(0.8);
  });

  it('finds the entry face, not the exit one, for a sweep passing all the way through', () => {
    // A sweep spanning the whole square finds both the left (entry) and
    // right (exit) faces as valid inflated-edge hits - the earlier, entry
    // one must win.
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: 10, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.t).toBeCloseTo(0.4);
  });

  it('returns a t of 0 when the circle already overlaps the polygon at the start position', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBe(0);
  });

  it('does not report an overlap for a start position diagonally beyond a corner', () => {
    // (1.9, 1.9) is close enough to the (1, 1) vertex that the coarse,
    // per-face separation check alone can't rule out an overlap (each
    // adjacent face's own separation is under the radius), but the actual
    // Euclidean distance to the vertex (~1.273) exceeds it - the corner's
    // own Voronoi-region check must still correctly say "not overlapping"
    // rather than short-circuiting to a t of 0.
    const radius = 1;

    const hit = sweepCirclePolygon(
      movingCircleBody(radius),
      staticPolygonBody(square()),
      { x: 1.9, y: 1.9 },
      { x: 1, y: 1 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBeGreaterThan(0);

    const distanceToVertex = Math.sqrt(0.9 * 0.9 * 2);
    const totalDistance = distanceToVertex;
    const traveled = distanceToVertex - radius;

    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(1);
    expect(hit?.t).toBeCloseTo(traveled / totalDistance);
  });

  it('finds the exact time of impact when the sweep just reaches the surface', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: -2, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.t).toBeCloseTo(1);
  });

  it('returns null when the sweep stops just short of the surface', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: -2.5, y: 0 },
    );

    expect(hit).toBeNull();
  });

  it('rounds a corner correctly when the sweep grazes a vertex rather than a face', () => {
    // Approaching along the diagonal y = x keeps the perpendicular foot on
    // both faces adjacent to the (1, 1) vertex outside their finite
    // segment range (see sweep-circle-polygon.ts's inflated-edge doc), so
    // only the vertex's own rounded-corner test can find this hit.
    const radius = 0.5;

    const hit = sweepCirclePolygon(
      movingCircleBody(radius),
      staticPolygonBody(square()),
      { x: 4, y: 4 },
      { x: 1, y: 1 },
    );

    expect(hit).not.toBeNull();

    // The actual contact point is the vertex itself, not the moving
    // circle's own center position at the moment of contact.
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(1);
    expect(hit?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(hit?.normal.y).toBeCloseTo(Math.SQRT1_2);

    const traveled = 3 * Math.SQRT2 - radius;
    const totalDistance = 3 * Math.SQRT2;

    expect(hit?.t).toBeCloseTo(traveled / totalDistance);
  });

  it('returns null for a zero-length sweep that does not already overlap', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    );

    expect(hit).toBeNull();
  });

  it('compares a face hit against nearby vertex hits and keeps the closer one', () => {
    // Radius 1.5 (vs. the square's half-width of 1) is enough for the
    // sweep along y=0.05 to also come within reach of both left-side
    // vertices' own rounded-corner circles, not just the face directly
    // ahead - exercising the comparison between a face hit and vertex
    // hits, and (since the tiny y-offset keeps the two vertex distances
    // from tying exactly) between the two vertex hits themselves too, not
    // just whichever the sweep reaches first.
    const radius = 1.5;

    const hit = sweepCirclePolygon(
      movingCircleBody(radius),
      staticPolygonBody(square()),
      { x: -10, y: 0.05 },
      { x: 0, y: 0.05 },
    );

    expect(hit).not.toBeNull();
    // The face is reached first (at x=-2.5, 7.5 units in) - closer than
    // either vertex's own rounded corner (each reached ~7.84-7.93 units
    // in).
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0.05);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.t).toBeCloseTo(0.75);
  });

  it('finds the earliest time of impact when a swept path grazes a sharp vertex before reaching a far edge', () => {
    // A thin wedge triangle: a sharp tip pointing left (the third vertex
    // below), with a wide base far to the right. `PolygonCollider`
    // re-centers vertices around their centroid, so the tip ends up at
    // roughly (-66.67, 0) rather than (0, 0) - see the logged vertices
    // this test's own assertions are derived from if this ever needs
    // re-deriving.
    const wedge = new PolygonCollider([
      { x: 0, y: 0 },
      { x: 100, y: 5 },
      { x: 100, y: -5 },
    ]);
    const radius = 1;

    // A long sweep, well past the tip and past the far base edge too, so
    // both the tip's own rounded corner and the base edge are valid
    // candidates - the tip, being far closer, must win.
    const hit = sweepCirclePolygon(
      movingCircleBody(radius),
      staticPolygonBody(wedge),
      { x: -100, y: 0.5 },
      { x: 150, y: 0.5 },
    );

    expect(hit).not.toBeNull();

    const tip = { x: -200 / 3, y: 0 };
    const perpendicularOffset = 0.5;
    const halfChord = Math.sqrt(
      radius * radius - perpendicularOffset * perpendicularOffset,
    );

    expect(hit?.point.x).toBeCloseTo(tip.x);
    expect(hit?.point.y).toBeCloseTo(tip.y);
    expect(hit?.normal.x).toBeCloseTo(-halfChord);
    expect(hit?.normal.y).toBeCloseTo(perpendicularOffset);

    const enteringX = tip.x - halfChord;
    const traveled = enteringX - -100;
    const totalDistance = 150 - -100;

    expect(hit?.t).toBeCloseTo(traveled / totalDistance);
  });

  it('accounts for the circle collider offset', () => {
    const collider = new CircleCollider(1);
    collider.offset = { x: 0, y: 5 };
    const body: CollisionBody = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider,
    };

    // The swept entity travels along y=-5, but `offset` puts the circle
    // itself 5 units higher, back onto y=0 where it can reach the square.
    const hit = sweepCirclePolygon(
      body,
      staticPolygonBody(square()),
      { x: -10, y: -5 },
      { x: 0, y: -5 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
  });
});
