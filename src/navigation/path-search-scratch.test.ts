import { beforeEach, describe, expect, it } from 'vitest';
import { PathSearchScratch } from './path-search-scratch.js';

describe('PathSearchScratch', () => {
  let scratch: PathSearchScratch;

  beforeEach(() => {
    scratch = new PathSearchScratch();
  });

  it('grows its per-node arrays to the node count and never shrinks them', () => {
    scratch.begin(10);
    expect(scratch.stamp).toHaveLength(10);
    expect(scratch.cost).toHaveLength(10);
    expect(scratch.estimate).toHaveLength(10);
    expect(scratch.parent).toHaveLength(10);

    scratch.begin(4);
    expect(scratch.stamp).toHaveLength(10);
  });

  it('forgets every reached node when the next search begins', () => {
    scratch.begin(4);
    scratch.reach(2, 5, 1, -1);
    expect(scratch.isReached(2)).toBe(true);
    expect(scratch.isReached(1)).toBe(false);

    scratch.begin(4);
    expect(scratch.isReached(2)).toBe(false);
  });

  it('forgets reached nodes when growing for a bigger graph', () => {
    scratch.begin(2);
    scratch.reach(1, 0, 0, -1);

    scratch.begin(8);
    expect(scratch.isReached(1)).toBe(false);
  });

  it('clears its stamps when the search id wraps around', () => {
    scratch.begin(4);
    scratch.searchId = 0xffffffff - 1;

    scratch.begin(4);
    expect(scratch.searchId).toBe(0xffffffff);
    scratch.reach(0, 0, 0, -1);

    // The next search would pass the largest stamp, so it starts again at 1.
    scratch.begin(4);
    expect(scratch.searchId).toBe(1);
    expect(scratch.isReached(0)).toBe(false);
    scratch.reach(3, 0, 0, -1);

    scratch.begin(4);
    expect(scratch.searchId).toBe(2);
    expect(scratch.isReached(3)).toBe(false);
  });

  it('keeps entries when growing the entry arrays and forgets them when a search begins', () => {
    scratch.begin(1);

    for (let i = 0; i < 200; i++) {
      expect(scratch.addEntry(0, i, i * 2)).toBe(i);
    }

    expect(scratch.entryNode.length).toBeGreaterThanOrEqual(200);

    for (let i = 0; i < 200; i++) {
      expect(scratch.entryCost[i]).toBe(i);
      expect(scratch.entryTotal[i]).toBe(i * 2);
    }

    scratch.begin(1);
    expect(scratch.entryCount).toBe(0);
    expect(scratch.addEntry(0, 0, 0)).toBe(0);
  });
});
