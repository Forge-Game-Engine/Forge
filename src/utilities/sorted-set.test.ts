import { beforeEach, describe, expect, it } from 'vitest';
import SortedSet from './sorted-set';

describe('SortedSet', () => {
  let set: SortedSet<{ name: string }>;

  beforeEach(() => {
    set = new SortedSet();
  });

  it('orders by priority ascending and preserves insertion order for equal priorities', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };

    set.add(a, 2);
    set.add(b, 1);
    set.add(c, 1);

    const values = Array.from(set.values());

    expect(values).toEqual([b, c, a]);
  });

  it('does not allow duplicate items (by reference) and returns false when no change', () => {
    const x = { name: 'x' };

    const first = set.add(x, 5);
    const second = set.add(x, 5);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(set.size).toBe(1);
  });

  it('updates priority and reorders items', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    set.add(a, 2);
    set.add(b, 3);

    // move b to higher priority (lower number)
    const changed = set.add(b, 1);

    expect(changed).toBe(true);
    expect(Array.from(set.values())).toEqual([b, a]);
    expect(set.getPriority(b)).toBe(1);
  });

  it('delete, has, getPriority work as expected', () => {
    const a = { name: 'a' };

    set.add(a, 1);

    expect(set.has(a)).toBe(true);
    expect(set.getPriority(a)).toBe(1);

    const removed = set.delete(a);
    expect(removed).toBe(true);
    expect(set.has(a)).toBe(false);
    expect(set.getPriority(a)).toBeUndefined();
  });

  it('clear empties the set and resets ordering behavior', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    set.add(a, 1);
    set.add(b, 1);

    expect(set.size).toBe(2);

    set.clear();

    expect(set.size).toBe(0);

    const c = { name: 'c' };
    const d = { name: 'd' };

    set.add(c, 1);
    set.add(d, 1);

    expect(Array.from(set.values())).toEqual([c, d]);
  });

  it('entries yields [item, priority] pairs in order and forEach works', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };

    set.add(a, 2);
    set.add(b, 1);

    const entries = Array.from(set.entries());
    expect(entries[0][0]).toBe(b);
    expect(entries[0][1]).toBe(1);
    expect(entries[1][0]).toBe(a);
    expect(entries[1][1]).toBe(2);

    const seen: string[] = [];
    set.forEach((item) => seen.push(item.name));
    expect(seen).toEqual(['b', 'a']);
  });
});
