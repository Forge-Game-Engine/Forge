import { beforeEach, describe, expect, it } from 'vitest';
import { SparseSet } from './sparse-set';

describe('SparseSet', () => {
  let set: SparseSet<string>;

  beforeEach(() => {
    set = new SparseSet<string>();
  });

  it('adds, has and gets components', () => {
    set.add(1, 'one');
    expect(set.has(1)).toBe(true);
    expect(set.get(1)).toBe('one');
    expect(set.get(2)).toBeNull();
    expect(set.has(2)).toBe(false);
  });

  it('updates component when adding existing entity', () => {
    set.add(1, 'first');
    expect(set.get(1)).toBe('first');
    set.add(1, 'second');
    expect(set.get(1)).toBe('second');
  });

  it('handles entity 0 correctly', () => {
    set.add(0, 'zero');
    expect(set.has(0)).toBe(true);
    expect(set.get(0)).toBe('zero');
    set.remove(0);
    expect(set.has(0)).toBe(false);
    expect(set.get(0)).toBeNull();
  });

  it('remove swaps last element into removed slot and updates mappings', () => {
    // Add three entities
    set.add(2, 'a');
    set.add(5, 'b');
    set.add(7, 'c');

    // Remove middle entity (5). Last (7) should move into 5's slot.
    set.remove(5);
    expect(set.has(5)).toBe(false);
    expect(set.get(5)).toBeNull();

    // 7 should still be present and return its component
    expect(set.has(7)).toBe(true);
    expect(set.get(7)).toBe('c');

    // 2 should be unaffected
    expect(set.has(2)).toBe(true);
    expect(set.get(2)).toBe('a');

    // Now remove the last element (which may now be at the swapped index)
    set.remove(7);
    expect(set.has(7)).toBe(false);
    expect(set.get(7)).toBeNull();

    // 2 still present
    expect(set.has(2)).toBe(true);
    expect(set.get(2)).toBe('a');
  });

  it('removing non-existent entity is a no-op', () => {
    set.add(10, 'ten');
    expect(set.has(10)).toBe(true);
    // remove an entity that was never added
    set.remove(99);
    // original remains intact
    expect(set.has(10)).toBe(true);
    expect(set.get(10)).toBe('ten');
  });

  it('size reflects number of stored components', () => {
    expect(set.size).toBe(0);

    set.add(1, 'one');
    expect(set.size).toBe(1);

    set.add(2, 'two');
    expect(set.size).toBe(2);

    // updating existing entity does not change size
    set.add(1, 'one-updated');
    expect(set.size).toBe(2);

    // removing existing decreases size
    set.remove(2);
    expect(set.size).toBe(1);

    // removing non-existent is no-op
    set.remove(99);
    expect(set.size).toBe(1);

    set.remove(1);
    expect(set.size).toBe(0);
  });

  it('size accounts for entity 0 correctly', () => {
    expect(set.size).toBe(0);
    set.add(0, 'zero');
    expect(set.size).toBe(1);
    set.add(0, 'zero-updated');
    expect(set.size).toBe(1);
    set.remove(0);
    expect(set.size).toBe(0);
  });
});
