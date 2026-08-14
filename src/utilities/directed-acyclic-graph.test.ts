import { beforeEach, describe, expect, it } from 'vitest';
import { DirectedAcyclicGraph } from './directed-acyclic-graph';

describe('DirectedAcyclicGraph', () => {
  let graph: DirectedAcyclicGraph<{ name: string }>;

  beforeEach(() => {
    graph = new DirectedAcyclicGraph((node) => node.name);
  });

  it('preserves insertion order for nodes with no edges', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);

    expect(graph.topologicalSort()).toEqual([a, b, c]);
  });

  it('does not add the same node twice', () => {
    const a = { name: 'a' };

    graph.addNode(a);
    graph.addNode(a);

    expect(graph.size).toBe(1);
  });

  it('orders a node before another when an edge is declared between them', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addEdge(b, a);

    expect(graph.topologicalSort()).toEqual([b, a]);
  });

  it('resolves transitive dependencies', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };
    const d = { name: 'd' };

    [a, b, c, d].forEach((node) => graph.addNode(node));

    // diamond: a -> b -> d, a -> c -> d
    graph.addEdge(a, b);
    graph.addEdge(a, c);
    graph.addEdge(b, d);
    graph.addEdge(c, d);

    const order = graph.topologicalSort();

    expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
    expect(order.indexOf(a)).toBeLessThan(order.indexOf(c));
    expect(order.indexOf(b)).toBeLessThan(order.indexOf(d));
    expect(order.indexOf(c)).toBeLessThan(order.indexOf(d));
    expect(order).toEqual([a, b, c, d]);
  });

  it('keeps insertion order between nodes with no ordering constraint', () => {
    const early = { name: 'early' };
    const unconstrained1 = { name: 'unconstrained1' };
    const unconstrained2 = { name: 'unconstrained2' };
    const late = { name: 'late' };

    graph.addNode(unconstrained1);
    graph.addNode(early);
    graph.addNode(late);
    graph.addNode(unconstrained2);

    graph.addEdge(early, late);

    expect(graph.topologicalSort()).toEqual([
      unconstrained1,
      early,
      late,
      unconstrained2,
    ]);
  });

  it('is a no-op when the same edge is added twice', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);

    expect(() => {
      graph.addEdge(a, b);
      graph.addEdge(a, b);
    }).not.toThrow();

    expect(graph.topologicalSort()).toEqual([a, b]);
  });

  it('throws when adding an edge from a node that has not been added', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(b);

    expect(() => graph.addEdge(a, b)).toThrow(/has not been added/);
  });

  it('throws when adding an edge to a node that has not been added', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);

    expect(() => graph.addEdge(a, b)).toThrow(/has not been added/);
  });

  it('throws when adding an edge from a node to itself', () => {
    const a = { name: 'a' };

    graph.addNode(a);

    expect(() => graph.addEdge(a, a)).toThrow(/to itself/);
  });

  it('throws with a descriptive cycle when adding an edge creates a direct cycle', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addEdge(a, b);

    expect(() => graph.addEdge(b, a)).toThrow(/b -> a -> b/);
  });

  it('throws with a descriptive cycle when adding an edge creates an indirect cycle', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addEdge(a, b);
    graph.addEdge(b, c);

    expect(() => graph.addEdge(c, a)).toThrow(/c -> a -> b -> c/);
  });

  it('does not commit an edge that would create a cycle', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addEdge(a, b);

    expect(() => graph.addEdge(b, a)).toThrow();
    expect(graph.topologicalSort()).toEqual([a, b]);
  });

  it('uses a custom node label in error messages', () => {
    const a = { name: 'a' };
    const labeledGraph = new DirectedAcyclicGraph<{ name: string }>(
      (node) => node.name,
    );

    labeledGraph.addNode(a);

    expect(() => labeledGraph.addEdge(a, a)).toThrow(/"a"/);
  });

  it('removes a node and every edge connected to it', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addEdge(a, b);
    graph.addEdge(b, c);

    graph.removeNode(b);

    expect(graph.has(b)).toBe(false);
    expect(graph.size).toBe(2);
    expect(graph.topologicalSort()).toEqual([a, c]);

    // b's removal should not have left a dangling a -> c constraint
    graph.addEdge(c, a);
    expect(graph.topologicalSort()).toEqual([c, a]);
  });

  it('is a no-op to remove a node that was never added', () => {
    const a = { name: 'a' };

    expect(() => graph.removeNode(a)).not.toThrow();
    expect(graph.size).toBe(0);
  });

  it('reflects has() correctly as nodes are added and removed', () => {
    const a = { name: 'a' };

    expect(graph.has(a)).toBe(false);

    graph.addNode(a);
    expect(graph.has(a)).toBe(true);

    graph.removeNode(a);
    expect(graph.has(a)).toBe(false);
  });

  it('recomputes order after a mutation invalidates the cache', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);

    expect(graph.topologicalSort()).toEqual([a, b]);

    graph.addEdge(b, a);

    expect(graph.topologicalSort()).toEqual([b, a]);
  });

  it('returns a fresh array each call, so callers cannot mutate internal state', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    graph.addNode(a);
    graph.addNode(b);

    const first = graph.topologicalSort();
    first.pop();

    expect(graph.topologicalSort()).toEqual([a, b]);
  });
});
