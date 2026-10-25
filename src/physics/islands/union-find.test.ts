import { describe, expect, it } from 'vitest';
import { UnionFind } from './union-find.js';

describe('UnionFind', () => {
  it('starts with every index in its own set', () => {
    const unionFind = new UnionFind(4);

    expect([0, 1, 2, 3].map((i) => unionFind.find(i))).toEqual([0, 1, 2, 3]);
  });

  it('joins the sets of two indices', () => {
    const unionFind = new UnionFind(3);

    unionFind.union(0, 2);

    expect(unionFind.find(0)).toBe(unionFind.find(2));
    expect(unionFind.find(1)).not.toBe(unionFind.find(0));
  });

  it('joins sets transitively', () => {
    const unionFind = new UnionFind(5);

    unionFind.union(0, 1);
    unionFind.union(2, 3);
    unionFind.union(1, 3);

    const root = unionFind.find(0);

    expect([1, 2, 3].map((i) => unionFind.find(i))).toEqual([root, root, root]);
    expect(unionFind.find(4)).toBe(4);
  });

  it('leaves sets that are already joined unchanged', () => {
    const unionFind = new UnionFind(2);

    unionFind.union(0, 1);
    const root = unionFind.find(0);

    unionFind.union(1, 0);

    expect(unionFind.find(0)).toBe(root);
    expect(unionFind.find(1)).toBe(root);
  });

  it('puts the smaller set under the larger one', () => {
    const unionFind = new UnionFind(4);

    unionFind.union(1, 2);
    unionFind.union(1, 3);
    const largerRoot = unionFind.find(1);

    // The singleton {0} is named first but joins the three-index set.
    unionFind.union(0, 1);

    expect(unionFind.find(0)).toBe(largerRoot);
  });

  it('finds the root of a long chain of unions', () => {
    const size = 1000;
    const unionFind = new UnionFind(size);

    for (let i = 1; i < size; i++) {
      unionFind.union(i - 1, i);
    }

    const root = unionFind.find(0);

    for (let i = 0; i < size; i++) {
      expect(unionFind.find(i)).toBe(root);
    }
  });

  it('throws for an index out of range', () => {
    const unionFind = new UnionFind(2);

    expect(() => unionFind.find(2)).toThrow(/index 2/);
    expect(() => unionFind.find(-1)).toThrow(/index -1/);
    expect(() => unionFind.union(0, 5)).toThrow(/index 5/);
  });

  it('throws for an invalid size', () => {
    expect(() => new UnionFind(-1)).toThrow(/non-negative integer/);
    expect(() => new UnionFind(1.5)).toThrow(/non-negative integer/);
  });
});
