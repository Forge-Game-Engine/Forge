import { describe, expect, it } from 'vitest';
import { createOrthogonalGridLayout } from '../../math/index.js';
import {
  addCollisionEdge,
  createCollisionEdgeList,
  linkCollisionLoops,
} from './link-collision-loops.js';
import { collisionSnapSteps } from './tile-collision-variant.js';

const layout = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });
const steps = collisionSnapSteps;

describe('linkCollisionLoops', () => {
  it('joins edges into a loop starting at its smallest vertex', () => {
    const edges = createCollisionEdgeList();

    addCollisionEdge(edges, steps, steps, 0, steps);
    addCollisionEdge(edges, 0, steps, 0, 0);
    addCollisionEdge(edges, 0, 0, steps, 0);
    addCollisionEdge(edges, steps, 0, steps, steps);

    expect(linkCollisionLoops(edges, layout)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 16 },
        { x: 0, y: 16 },
      ],
    ]);
  });

  it('throws for an edge that nothing leaves the end of', () => {
    const edges = createCollisionEdgeList();

    addCollisionEdge(edges, 0, 0, steps, 0);

    expect(() => linkCollisionLoops(edges, layout)).toThrow(
      `no edge leaves (${steps}, 0). This is a bug in the engine.`,
    );
  });

  it('throws for edges that lead into a loop they aren’t part of', () => {
    const edges = createCollisionEdgeList();

    addCollisionEdge(edges, 0, 0, steps, 0);
    addCollisionEdge(edges, steps, 0, steps, steps);
    addCollisionEdge(edges, steps, steps, steps, 0);

    expect(() => linkCollisionLoops(edges, layout)).toThrow(
      'its edges don’t form closed loops. This is a bug in the engine.',
    );
  });
});
