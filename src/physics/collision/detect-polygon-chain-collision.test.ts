import { describe, expect, it } from 'vitest';
import { Random, Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import { detectPolygonChainCollision } from './detect-polygon-chain-collision.js';
import {
  featureIdEdgeStride,
  findPolygonEdgeManifolds,
  isBehindChainEdge,
} from './edge-chain-contacts.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

function body(
  position: Vector2,
  collider: PolygonCollider | ChainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

/**
 * Solid below `y = 0` from `x = -10` to `10`, its top split into twenty
 * collinear edges a unit long.
 */
function splitFloor(): ChainCollider {
  const top: Vector2[] = [];

  for (let x = -10; x <= 10; x++) {
    top.push({ x, y: 0 });
  }

  return new ChainCollider([[...top, { x: 10, y: 5 }, { x: -10, y: 5 }]]);
}

/**
 * A room: a hole from `x = -10` to `10` and `y = -10` to `0`, in unbounded
 * solid.
 */
function room(): ChainCollider {
  return new ChainCollider([
    [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: -10 },
      { x: -10, y: -10 },
    ],
  ]);
}

/**
 * A solid square from `(0, 0)` to `(10, 10)`.
 */
function platform(): ChainCollider {
  return new ChainCollider([
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  ]);
}

function edgeIndexOf(manifold: NarrowPhaseManifold): number {
  return Math.floor(manifold.featureIds[0] / featureIdEdgeStride);
}

describe('detectPolygonChainCollision', () => {
  it('pushes a box straight up at every position along a floor split into many edges', () => {
    const floor = body({ x: 0, y: 0 }, splitFloor());
    let checked = 0;

    for (let x = -5; x <= 5; x += 0.125) {
      const manifolds = detectPolygonChainCollision(
        body({ x, y: -0.9 }, rectangle(2, 2)),
        floor,
      );

      expect(manifolds.length).toBeGreaterThan(0);

      for (const manifold of manifolds) {
        checked++;
        expect(Math.abs(manifold.normal.x)).toBeLessThan(1e-9);
        expect(manifold.normal.y).toBeCloseTo(1);
        expect(manifold.depth).toBeCloseTo(0.1);
      }
    }

    expect(checked).toBeGreaterThan(80);
  });

  it('gives a box in a concave corner one manifold from each wall', () => {
    const manifolds = detectPolygonChainCollision(
      body({ x: 9.1, y: -0.9 }, rectangle(2, 2)),
      body({ x: 0, y: 0 }, room()),
    );

    expect(manifolds).toHaveLength(2);
    expect(manifolds.map(edgeIndexOf)).toEqual([0, 1]);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[1].normal.x).toBeCloseTo(1);
  });

  it('pushes a box balanced on a platform’s corner straight up', () => {
    const manifolds = detectPolygonChainCollision(
      body({ x: 10.5, y: -0.9 }, rectangle(2, 2)),
      body({ x: 0, y: 0 }, platform()),
    );

    // Both edges meeting at the corner touch the box, and a push straight
    // up is inside the fan of directions the convex corner opens between
    // their normals, so neither pushes it sideways off the platform.
    expect(manifolds.map(edgeIndexOf)).toEqual([0, 1]);

    for (const manifold of manifolds) {
      expect(manifold.normal.x).toBeCloseTo(0);
      expect(manifold.normal.y).toBeCloseTo(1);
      expect(manifold.depth).toBeCloseTo(0.1);
    }
  });

  it('keeps an edge whose line the centroid is behind when a convex neighbor faces it', () => {
    const manifolds = detectPolygonChainCollision(
      body({ x: 10.5, y: 0.2 }, rectangle(2, 2)),
      body({ x: 0, y: 0 }, platform()),
    );

    expect(manifolds.map(edgeIndexOf)).toContain(0);
  });

  it('doesn’t push a box whose center is inside solid', () => {
    expect(
      detectPolygonChainCollision(
        body({ x: 5, y: 2 }, rectangle(2, 2)),
        body({ x: 0, y: 0 }, platform()),
      ),
    ).toEqual([]);
  });

  it('collides with a rotated, translated chain in its world pose', () => {
    // Turning the platform a quarter turn (from +X towards +Y) about its
    // origin puts its top edge, local y = 0, on world x = 100.
    const manifolds = detectPolygonChainCollision(
      body({ x: 100.9, y: 5 }, rectangle(2, 2)),
      body({ x: 100, y: 0 }, platform(), Math.PI / 2),
    );

    expect(manifolds.map(edgeIndexOf)).toEqual([0]);
    expect(manifolds[0].normal.x).toBeCloseTo(-1);
    expect(manifolds[0].normal.y).toBeCloseTo(0);
  });

  it('returns the same manifolds as testing every edge', () => {
    const random = new Random('polygon-chain-tree');
    const jagged: Vector2[] = [];

    for (let x = -20; x <= 20; x++) {
      jagged.push({ x, y: random.randomFloat(-0.5, 0.5) });
    }

    const chain = new ChainCollider([
      [...jagged, { x: 20, y: 10 }, { x: -20, y: 10 }],
    ]);
    const chainBody = body({ x: 0, y: 0 }, chain);
    const allEdges = chain.outline.edges.map((_edge, index) => index);
    let compared = 0;

    for (let i = 0; i < 100; i++) {
      const polygonBody = body(
        {
          x: random.randomFloat(-22, 22),
          y: random.randomFloat(-2, 1),
        },
        rectangle(random.randomFloat(0.5, 4), random.randomFloat(0.5, 2)),
        random.randomFloat(-0.5, 0.5),
      );
      const polygon = polygonBody.collider as PolygonCollider;
      // The rectangle's center of mass is its body's position, and the
      // chain sits unrotated at the origin.
      const localCenter = polygonBody.position;
      const expected = findPolygonEdgeManifolds(
        chain.outline,
        allEdges.filter(
          (edgeIndex) =>
            !isBehindChainEdge(chain.outline, edgeIndex, localCenter),
        ),
        {
          vertices: polygon.getWorldVertices(
            polygonBody.position,
            polygonBody.rotation,
          ),
          normals: polygon.getWorldNormals(polygonBody.rotation),
        },
        chainBody,
      );

      const actual = detectPolygonChainCollision(polygonBody, chainBody);

      compared += actual.length;
      expect(actual).toEqual(expected);
    }

    expect(compared).toBeGreaterThan(20);
  });
});

describe('isBehindChainEdge', () => {
  function floorWithJoint(endY: number): ChainCollider {
    return new ChainCollider([
      [
        { x: -10, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: endY },
        { x: 10, y: 20 },
        { x: -10, y: 20 },
      ],
    ]);
  }

  it('treats a joint that turns by less than the convex tolerance as straight', () => {
    // A turn of about 0.005 radians: a point behind both edges' lines is
    // behind the first edge, whichever side of the second it's on.
    const { outline } = floorWithJoint(0.05);

    expect(isBehindChainEdge(outline, 0, { x: 5, y: 0.01 })).toBe(true);
  });

  it('keeps an edge whose convex neighbor the point is in front of', () => {
    // A turn of about 0.1 radians: a convex corner.
    const { outline } = floorWithJoint(1);

    expect(isBehindChainEdge(outline, 0, { x: 5, y: 0.3 })).toBe(false);
  });

  it('is never behind an edge the point is in front of', () => {
    const { outline } = floorWithJoint(1);

    expect(isBehindChainEdge(outline, 0, { x: -5, y: -1 })).toBe(false);
  });
});
