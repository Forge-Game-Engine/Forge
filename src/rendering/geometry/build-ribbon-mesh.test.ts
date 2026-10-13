import { describe, expect, it } from 'vitest';
import type { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import {
  buildRibbonMesh,
  createRibbonMeshBuffers,
  RibbonMeshBuffers,
  RibbonMeshOptions,
  RibbonPoint,
} from './build-ribbon-mesh.js';

interface Vertex {
  x: number;
  y: number;
  u: number;
  v: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

const stretch: RibbonMeshOptions = { textureMode: 'stretch', miterLimit: 4 };
const white = { r: 1, g: 1, b: 1, a: 1 };

/**
 * Builds points along `positions` with one width and their cumulative
 * distances.
 */
function polyline(
  positions: readonly [number, number][],
  width: number = 2,
): RibbonPoint[] {
  let distance = 0;

  return positions.map(([x, y], i) => {
    if (i > 0) {
      const [previousX, previousY] = positions[i - 1];

      distance += Math.hypot(x - previousX, y - previousY);
    }

    return { position: { x, y }, width, color: white, distance };
  });
}

function vertexAt(buffers: RibbonMeshBuffers, index: number): Vertex {
  return {
    x: buffers.positions[index * 2],
    y: buffers.positions[index * 2 + 1],
    u: buffers.uvs[index * 2],
    v: buffers.uvs[index * 2 + 1],
    r: buffers.colors[index * 4],
    g: buffers.colors[index * 4 + 1],
    b: buffers.colors[index * 4 + 2],
    a: buffers.colors[index * 4 + 3],
  };
}

function vertices(buffers: RibbonMeshBuffers, count: number): Vertex[] {
  return Array.from({ length: count }, (_, i) => vertexAt(buffers, i));
}

function build(
  points: readonly RibbonPoint[],
  options: RibbonMeshOptions = stretch,
): { count: number; vertices: Vertex[] } {
  const buffers = createRibbonMeshBuffers(Math.max(points.length, 2));
  const count = buildRibbonMesh(points, options, buffers);

  return { count, vertices: vertices(buffers, count) };
}

function expectPosition(vertex: Vertex, x: number, y: number): void {
  expect(vertex.x).toBeCloseTo(x, 5);
  expect(vertex.y).toBeCloseTo(y, 5);
}

/** The distance from `vertex` to the infinite line through `from` and `to`. */
function distanceToLine(vertex: Vertex, from: Vector2, to: Vector2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return (
    Math.abs((vertex.x - from.x) * dy - (vertex.y - from.y) * dx) /
    Math.hypot(dx, dy)
  );
}

function distanceTo(vertex: Vertex, point: Vector2): number {
  return Math.hypot(vertex.x - point.x, vertex.y - point.y);
}

/** Points along `+X` to the origin, then turning by `turn` radians. */
function turnAtOrigin(turn: number, length: number = 10): RibbonPoint[] {
  return polyline([
    [-length, 0],
    [0, 0],
    [length * Math.cos(turn), length * Math.sin(turn)],
  ]);
}

/** The signed area of the quad between pairs `i` and `i + 1` of a strip. */
function quadArea(strip: Vertex[], pair: number): number {
  const corners = [
    strip[pair * 2],
    strip[pair * 2 + 2],
    strip[pair * 2 + 3],
    strip[pair * 2 + 1],
  ];

  let area = 0;

  for (let i = 0; i < corners.length; i++) {
    const current = corners[i];
    const next = corners[(i + 1) % corners.length];

    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

function arc(radius: number, segments: number): RibbonPoint[] {
  return polyline(
    Array.from({ length: segments + 1 }, (_, i): [number, number] => {
      const angle = (i / segments) * (Math.PI / 2);

      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    }),
  );
}

describe('buildRibbonMesh', () => {
  describe('straight lines', () => {
    it('should offset two points to both sides of the line', () => {
      const { count, vertices } = build(
        polyline([
          [0, 0],
          [10, 0],
        ]),
      );

      expect(count).toBe(4);
      expectPosition(vertices[0], 0, 1);
      expectPosition(vertices[1], 0, -1);
      expectPosition(vertices[2], 10, 1);
      expectPosition(vertices[3], 10, -1);
      // V 1 on the +n edge (+Y, below the line on screen), 0 on the −n edge.
      expect(vertices.map((vertex) => vertex.v)).toEqual([1, 0, 1, 0]);
    });

    it('should give a straight interior point a pair at the half width', () => {
      const { count, vertices } = build(
        polyline([
          [0, 0],
          [5, 0],
          [10, 0],
        ]),
      );

      expect(count).toBe(6);
      expectPosition(vertices[2], 5, 1);
      expectPosition(vertices[3], 5, -1);
    });

    it.each<[[number, number], [number, number]]>([
      [
        [1, 1],
        [2, 2],
      ],
      [
        [0.1, 0.7],
        [0.2, 1.4],
      ],
    ])(
      'should keep the width along collinear diagonal points through %j',
      (middle, end) => {
        const points = polyline([[0, 0], middle, end]);
        const { count, vertices } = build(points);

        expect(count).toBe(6);

        for (const vertex of vertices) {
          expect(Number.isNaN(vertex.x) || Number.isNaN(vertex.y)).toBe(false);
        }

        expect(distanceTo(vertices[2], points[1].position)).toBeCloseTo(1, 5);
        expect(distanceTo(vertices[3], points[1].position)).toBeCloseTo(1, 5);
      },
    );
  });

  describe('miter joins', () => {
    it('should keep the width around a 90° clockwise turn', () => {
      const points = polyline([
        [0, 0],
        [10, 0],
        [10, 10],
      ]);
      const { count, vertices } = build(points);

      expect(count).toBe(6);
      // The inner (+n) vertex, then the outer (−n) one, √2·h from the
      // corner.
      expectPosition(vertices[2], 9, 1);
      expectPosition(vertices[3], 11, -1);
      expect(distanceTo(vertices[3], points[1].position)).toBeCloseTo(
        Math.SQRT2,
      );

      for (const vertex of [vertices[2], vertices[3]]) {
        expect(
          distanceToLine(vertex, points[0].position, points[1].position),
        ).toBeCloseTo(1);
        expect(
          distanceToLine(vertex, points[1].position, points[2].position),
        ).toBeCloseTo(1);
      }
    });

    it('should keep the width around a 90° counter-clockwise turn', () => {
      const points = polyline([
        [0, 0],
        [10, 0],
        [10, -10],
      ]);
      const { count, vertices } = build(points);

      expect(count).toBe(6);
      // The outer (+n) vertex, then the inner (−n) one.
      expectPosition(vertices[2], 11, 1);
      expectPosition(vertices[3], 9, -1);

      for (const vertex of [vertices[2], vertices[3]]) {
        expect(
          distanceToLine(vertex, points[0].position, points[1].position),
        ).toBeCloseTo(1);
        expect(
          distanceToLine(vertex, points[1].position, points[2].position),
        ).toBeCloseTo(1);
      }
    });

    it('should keep the miter just under the miter limit', () => {
      // A miter limit of 2 bevels turns sharper than 120°.
      const { count } = build(turnAtOrigin((119 * Math.PI) / 180), {
        textureMode: 'stretch',
        miterLimit: 2,
      });

      expect(count).toBe(6);
    });

    it('should bevel the outer side just over the miter limit', () => {
      const turn = (121 * Math.PI) / 180;
      const { count, vertices } = build(turnAtOrigin(turn), {
        textureMode: 'stretch',
        miterLimit: 2,
      });

      expect(count).toBe(8);
      // A clockwise turn: the outer side is −n, at q − a·h, then q − b·h.
      expectPosition(vertices[3], 0, -1);
      expectPosition(vertices[5], Math.sin(turn), -Math.cos(turn));
      // Both pairs share the inner vertex.
      expect(vertices[4]).toEqual(vertices[2]);
    });
  });

  describe('hairpin turns', () => {
    it.each([
      ['clockwise', 1],
      ['counter-clockwise', -1],
    ])('should bevel a near-180° %s turn without a spike', (_, side) => {
      const turn = side * ((179 * Math.PI) / 180);
      const { count, vertices } = build(turnAtOrigin(turn));
      const sinHalfTurn = Math.sin(Math.abs(turn) / 2);
      const bound = Math.max(1, 10 / (2 * sinHalfTurn));

      expect(count).toBe(8);

      for (const vertex of vertices.slice(2, 6)) {
        expect(distanceTo(vertex, { x: 0, y: 0 })).toBeLessThanOrEqual(
          bound + 1e-5,
        );
        expect(distanceTo(vertex, { x: 0, y: 0 })).toBeLessThan(4 * 2);
      }
    });

    it('should bevel an exact reversal with the inner vertex behind the turning point', () => {
      const points = polyline([
        [0, 0],
        [10, 0],
        [5, 0],
      ]);
      const { count, vertices } = build(points);

      expect(count).toBe(8);

      for (const vertex of vertices) {
        expect(Number.isNaN(vertex.x) || Number.isNaN(vertex.y)).toBe(false);
      }

      // The inner vertex is in the +n slot, half the shorter segment back
      // along the incoming segment.
      expectPosition(vertices[2], 7.5, 0);
      expectPosition(vertices[4], 7.5, 0);
      // The outer vertices are q − a·h and q + a·h.
      expectPosition(vertices[3], 10, -1);
      expectPosition(vertices[5], 10, 1);
    });

    it.each([
      ['clockwise', 1e-6, 1],
      ['clockwise', 1e-12, 1],
      ['counter-clockwise', 1e-6, -1],
      ['counter-clockwise', 1e-12, -1],
    ])(
      'should bevel a %s turn %f radians short of 180° on the same side as at 179°',
      (_, shortBy, side) => {
        const nearlyReversed = build(turnAtOrigin(side * (Math.PI - shortBy)));
        const at179 = build(turnAtOrigin(side * ((179 * Math.PI) / 180)));
        const innerSlot = side > 0 ? 0 : 1;

        expect(nearlyReversed.count).toBe(8);
        expect(at179.count).toBe(8);

        for (const vertex of nearlyReversed.vertices) {
          expect(Number.isNaN(vertex.x) || Number.isNaN(vertex.y)).toBe(false);
        }

        for (const strip of [nearlyReversed.vertices, at179.vertices]) {
          // The inner vertex is repeated in its slot of both bevel pairs,
          // behind the turning point on the incoming segment.
          const inner = strip[2 + innerSlot];

          expect(strip[4 + innerSlot]).toEqual(inner);
          expect(inner.x).toBeLessThan(0);
          expect(Math.abs(inner.y)).toBeLessThan(Math.abs(inner.x));
        }

        for (const vertex of nearlyReversed.vertices.slice(2, 6)) {
          expect(distanceTo(vertex, { x: 0, y: 0 })).toBeLessThanOrEqual(
            5 + 1e-5,
          );
        }

        // The outer bevel vertices are on the other side of the incoming
        // segment from the inner side.
        expect(Math.sign(nearlyReversed.vertices[3 - innerSlot].y)).toBe(-side);
      },
    );

    it('should place a nearly reversed miter accurately', () => {
      // c = cos(half the turn) is about 5e-7 here, which the
      // sqrt((1 + dot) / 2) form only gets to about 1e-4.
      const shortBy = 1e-6;
      const halfWidth = 1e-7;
      const points = turnAtOrigin(Math.PI - shortBy).map((point) => ({
        ...point,
        width: halfWidth * 2,
      }));
      const { vertices } = build(points);
      const expected = halfWidth / Math.sin(shortBy / 2);

      expect(expected).toBeCloseTo(0.2);
      expect(
        Math.abs(distanceTo(vertices[2], { x: 0, y: 0 }) - expected) / expected,
      ).toBeLessThan(1e-6);
    });

    it('should not fold the strip on a curve tighter than the half width', () => {
      const gentle = build(arc(20, 16));
      const tight = build(arc(0.5, 16));

      expect(gentle.count).toBe(34);
      expect(tight.count).toBe(34);

      const sign = Math.sign(quadArea(gentle.vertices, 0));

      for (let pair = 0; pair < 16; pair++) {
        expect(Math.sign(quadArea(gentle.vertices, pair))).toBe(sign);
        expect(Math.sign(quadArea(tight.vertices, pair))).toBe(sign);
      }
    });
  });

  describe('close points', () => {
    it('should skip a point that repeats the one before it', () => {
      const once = build(
        polyline([
          [0, 0],
          [5, 3],
          [10, 0],
        ]),
      );
      const repeated = build(
        polyline([
          [0, 0],
          [5, 3],
          [5, 3],
          [5, 3],
          [10, 0],
        ]),
      );

      expect(repeated.count).toBe(once.count);
      expect(repeated.vertices).toEqual(once.vertices);
    });

    it('should return 0 when every point is the same', () => {
      expect(
        build(
          polyline([
            [3, 4],
            [3, 4],
            [3, 4],
          ]),
        ).count,
      ).toBe(0);
    });

    it('should return 0 for a single point or none', () => {
      expect(build(polyline([[3, 4]])).count).toBe(0);
      expect(build([]).count).toBe(0);
    });

    it('should keep a point every 1e-4 units of a line that creeps forward', () => {
      const step = 0.3e-4;
      const points = polyline([
        ...Array.from({ length: 11 }, (_, i): [number, number] => [
          i * step,
          0,
        ]),
        [1, 0],
      ]);
      const { count, vertices } = build(points);

      // The first point, 4 and 8 steps in, and the last point.
      expect(count).toBe(8);
      expect(vertices[2].x).toBeCloseTo(4 * step, 8);
      expect(vertices[4].x).toBeCloseTo(8 * step, 8);
    });

    it('should keep the last point over an interior point close to it', () => {
      const red = { r: 1, g: 0, b: 0, a: 1 };
      const points: RibbonPoint[] = [
        ...polyline([
          [0, 0],
          [10, 0],
        ]),
        {
          position: { x: 10 + 0.5e-4, y: 0 },
          width: 4,
          color: red,
          distance: 99,
        },
      ];
      const { count, vertices } = build(points, {
        textureMode: 'tile',
        tileLength: 1,
        miterLimit: 4,
      });

      expect(count).toBe(4);
      expectPosition(vertices[2], 10 + 0.5e-4, 2);
      expectPosition(vertices[3], 10 + 0.5e-4, -2);
      expect(vertices[2]).toMatchObject({ u: 99, ...red });
    });
  });

  describe('widths', () => {
    it('should put both vertices on the line for a width of 0', () => {
      const { vertices } = build(
        polyline(
          [
            [0, 0],
            [5, 5],
            [10, 0],
          ],
          0,
        ),
      );

      for (let pair = 0; pair < 3; pair++) {
        expect(vertices[pair * 2].x).toBe(vertices[pair * 2 + 1].x);
        expect(vertices[pair * 2].y).toBe(vertices[pair * 2 + 1].y);
      }
    });

    it('should taper between points of different widths', () => {
      const points = polyline([
        [0, 0],
        [5, 0],
        [10, 0],
      ]).map((point, i) => ({ ...point, width: 2 - i }));
      const { vertices } = build(points);

      expectPosition(vertices[0], 0, 1);
      expectPosition(vertices[1], 0, -1);
      expectPosition(vertices[2], 5, 0.5);
      expectPosition(vertices[3], 5, -0.5);
      expectPosition(vertices[4], 10, 0);
      expectPosition(vertices[5], 10, 0);
    });
  });

  describe('texture coordinates', () => {
    const line = polyline([
      [0, 0],
      [5, 0],
      [10, 0],
    ]);

    function uPerPoint(
      distances: readonly number[],
      options: RibbonMeshOptions,
    ): number[] {
      const points = line.map((point, i) => ({
        ...point,
        distance: distances[i],
      }));
      const { vertices } = build(points, options);

      // `+ 0` turns `-0` (from `0 / -10`) into `0`, the same coordinate.
      return vertices
        .filter((_, i) => i % 2 === 0)
        .map((vertex) => vertex.u + 0);
    }

    it("should stretch U from 0 to 1 in 'stretch' mode", () => {
      expect(uPerPoint([0, 5, 10], stretch)).toEqual([0, 0.5, 1]);
      expect(uPerPoint([10, 5, 0], stretch)).toEqual([0, 0.5, 1]);
      expect(uPerPoint([3, 3, 3], stretch)).toEqual([0, 0, 0]);
    });

    it("should repeat U every tileLength in 'tile' mode", () => {
      const tile: RibbonMeshOptions = {
        textureMode: 'tile',
        tileLength: 2,
        miterLimit: 4,
      };

      expect(uPerPoint([1, 6, 11], tile)).toEqual([0.5, 3, 5.5]);
      expect(uPerPoint([1e7 + 1, 1e7 + 6, 1e7 + 11], tile)).toEqual([
        0.5, 3, 5.5,
      ]);
    });

    it('should give V 1 on the +n edge and 0 on the −n edge', () => {
      const { vertices } = build(line);

      // Vertices alternate +n, −n.
      expect(vertices.map((vertex) => vertex.v)).toEqual([1, 0, 1, 0, 1, 0]);
    });
  });

  describe('colors', () => {
    it("should give each vertex its point's straight-alpha color", () => {
      const colors = [
        { r: 2, g: 0.5, b: 0.25, a: 0.5 },
        new Color(0, 1, 0, 0.25),
      ];
      const points = polyline([
        [0, 0],
        [10, 0],
      ]).map((point, i) => ({ ...point, color: colors[i] }));
      const { vertices } = build(points);

      expect(vertices[0]).toMatchObject({ r: 2, g: 0.5, b: 0.25, a: 0.5 });
      expect(vertices[1]).toMatchObject({ r: 2, g: 0.5, b: 0.25, a: 0.5 });
      expect(vertices[2]).toMatchObject({ r: 0, g: 1, b: 0, a: 0.25 });
      expect(vertices[3]).toMatchObject({ r: 0, g: 1, b: 0, a: 0.25 });
    });
  });

  describe('buffers', () => {
    it.each([
      [2, 4],
      [3, 8],
      [64, 256],
    ])(
      'should create buffers for %i points with room for %i vertices',
      (pointCapacity, vertexCapacity) => {
        const buffers = createRibbonMeshBuffers(pointCapacity);

        expect(buffers.positions).toHaveLength(vertexCapacity * 2);
        expect(buffers.uvs).toHaveLength(vertexCapacity * 2);
        expect(buffers.colors).toHaveLength(vertexCapacity * 4);
      },
    );

    it.each([1, 2.5, Number.NaN])(
      'should throw for a point capacity of %f',
      (pointCapacity) => {
        expect(() => createRibbonMeshBuffers(pointCapacity)).toThrow(
          `point capacity of "${pointCapacity}"`,
        );
      },
    );

    it('should reuse buffers that fit and grow ones that do not', () => {
      const buffers = createRibbonMeshBuffers(3);
      const { positions, uvs, colors } = buffers;
      const short = polyline([
        [0, 0],
        [5, 0],
        [10, 0],
      ]);

      buildRibbonMesh(short, stretch, buffers);

      expect(buffers.positions).toBe(positions);
      expect(buffers.uvs).toBe(uvs);
      expect(buffers.colors).toBe(colors);

      const long = polyline([
        [0, 0],
        [5, 0],
        [10, 0],
        [15, 0],
        [20, 0],
      ]);

      expect(buildRibbonMesh(long, stretch, buffers)).toBe(10);
      expect(buffers.positions).not.toBe(positions);
      // 4 · 5 − 4 = 16 vertices, already a power of two.
      expect(buffers.positions).toHaveLength(32);
      expect(buffers.uvs).toHaveLength(32);
      expect(buffers.colors).toHaveLength(64);

      const grown = buffers.positions;

      buildRibbonMesh(short, stretch, buffers);

      expect(buffers.positions).toBe(grown);
    });
  });

  describe('validation', () => {
    const line = polyline([
      [0, 0],
      [10, 0],
    ]);

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
      'should throw for a width of %f',
      (width) => {
        const points = line.map((point) => ({ ...point, width }));

        expect(() =>
          buildRibbonMesh(points, stretch, createRibbonMeshBuffers(2)),
        ).toThrow(`width of "${width}" at point 0`);
      },
    );

    it.each([0.5, Number.NaN])(
      'should throw for a miter limit of %f',
      (miterLimit) => {
        expect(() =>
          buildRibbonMesh(
            line,
            { textureMode: 'stretch', miterLimit },
            createRibbonMeshBuffers(2),
          ),
        ).toThrow(`miter limit of "${miterLimit}"`);
      },
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'should throw for a tile length of %f',
      (tileLength) => {
        expect(() =>
          buildRibbonMesh(
            line,
            { textureMode: 'tile', tileLength, miterLimit: 4 },
            createRibbonMeshBuffers(2),
          ),
        ).toThrow(`tile length of "${tileLength}"`);
      },
    );
  });
});
