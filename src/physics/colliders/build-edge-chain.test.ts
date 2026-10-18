import { describe, expect, it } from 'vitest';
import * as physics from '../index.js';
import {
  createClosedEdgeChain,
  createOpenEdgeChain,
} from './build-edge-chain.js';

describe('createOpenEdgeChain', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: -10 },
  ];

  it('builds one edge per consecutive pair of points, open at both ends', () => {
    const chain = createOpenEdgeChain(points);

    expect(chain.edges).toHaveLength(2);
    expect(chain.vertexCount).toBe(3);
    expect(chain.edges[0]).toMatchObject({
      previous: null,
      next: 1,
      startVertex: 0,
      endVertex: 1,
    });
    expect(chain.edges[1]).toMatchObject({
      previous: 0,
      next: null,
      startVertex: 1,
      endVertex: 2,
    });
  });

  it('aliases the points and gives each edge a unit normal turned towards -Y', () => {
    const chain = createOpenEdgeChain(points);

    expect(chain.edges[0].start).toBe(points[0]);
    expect(chain.edges[0].end).toBe(points[1]);
    expect(chain.edges[1].start).toBe(points[1]);
    expect(chain.edges[0].normal.x).toBeCloseTo(0);
    expect(chain.edges[0].normal.y).toBeCloseTo(-1);
    expect(chain.edges[1].normal.x).toBeCloseTo(-Math.SQRT1_2);
    expect(chain.edges[1].normal.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('bounds every point and finds edges with its queries', () => {
    const chain = createOpenEdgeChain(points);

    expect(chain.bounds).toEqual({
      min: { x: 0, y: -10 },
      max: { x: 20, y: 0 },
    });
    expect(
      chain.queryEdges({ min: { x: 12, y: -100 }, max: { x: 13, y: 100 } }),
    ).toEqual([1]);
    expect(
      chain.queryEdgesAlongSegment({ x: 5, y: -5 }, { x: 5, y: 5 }),
    ).toEqual([0]);
  });
});

describe('createClosedEdgeChain', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const hole = [
    { x: 2, y: 2 },
    { x: 2, y: 8 },
    { x: 8, y: 8 },
  ];

  it('closes each loop on itself and numbers the loops one after another', () => {
    const chain = createClosedEdgeChain([square, hole]);

    expect(chain.edges).toHaveLength(7);
    expect(chain.vertexCount).toBe(7);
    expect(chain.edges[0]).toMatchObject({
      previous: 3,
      next: 1,
      startVertex: 0,
      endVertex: 1,
    });
    expect(chain.edges[3]).toMatchObject({
      previous: 2,
      next: 0,
      startVertex: 3,
      endVertex: 0,
    });
    expect(chain.edges[3].end).toBe(square[0]);
    expect(chain.edges[4]).toMatchObject({
      previous: 6,
      next: 5,
      startVertex: 4,
      endVertex: 5,
    });
    expect(chain.edges[6]).toMatchObject({
      previous: 5,
      next: 4,
      startVertex: 6,
      endVertex: 4,
    });
  });

  it('points every normal away from solid, for solid and hole loops alike', () => {
    const chain = createClosedEdgeChain([square, hole]);

    // The square surrounds solid, so its normals point out of it.
    expect(chain.edges[0].normal.y).toBeCloseTo(-1);
    expect(chain.edges[1].normal.x).toBeCloseTo(1);
    expect(chain.edges[2].normal.y).toBeCloseTo(1);
    expect(chain.edges[3].normal.x).toBeCloseTo(-1);
    // The hole is empty, so its normals point into it.
    expect(chain.edges[4].normal.x).toBeCloseTo(1);
    expect(chain.edges[5].normal.y).toBeCloseTo(-1);
  });
});

describe('physics module exports', () => {
  it('does not export the edge-chain builders', () => {
    expect(physics).not.toHaveProperty('createOpenEdgeChain');
    expect(physics).not.toHaveProperty('createClosedEdgeChain');
    expect(physics).not.toHaveProperty('EdgeTree');
    expect(physics).toHaveProperty('ChainCollider');
  });
});
