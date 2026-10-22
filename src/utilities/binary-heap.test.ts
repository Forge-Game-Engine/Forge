import { beforeEach, describe, expect, it } from 'vitest';
import { Random } from '../math/random.js';
import { BinaryHeap } from './binary-heap.js';

const byNumber = (a: number, b: number): number => a - b;

describe('BinaryHeap', () => {
  let heap: BinaryHeap<number>;

  beforeEach(() => {
    heap = new BinaryHeap(byNumber);
  });

  it('starts empty', () => {
    expect(heap.size).toBe(0);
  });

  it('pops numbers in compare order', () => {
    for (const value of [5, 3, 8, 1, 9, 2, 7]) {
      heap.push(value);
    }

    const popped: number[] = [];

    while (heap.size > 0) {
      popped.push(heap.pop());
    }

    expect(popped).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it('pops objects in the order of their key', () => {
    const objectHeap = new BinaryHeap<{ key: number; name: string }>(
      (a, b) => a.key - b.key,
    );

    objectHeap.push({ key: 2, name: 'b' });
    objectHeap.push({ key: 3, name: 'c' });
    objectHeap.push({ key: 1, name: 'a' });

    expect(objectHeap.pop().name).toBe('a');
    expect(objectHeap.pop().name).toBe('b');
    expect(objectHeap.pop().name).toBe('c');
  });

  it('returns every one of many equal items', () => {
    for (let i = 0; i < 50; i++) {
      heap.push(4);
    }

    heap.push(1);

    expect(heap.pop()).toBe(1);

    for (let i = 0; i < 50; i++) {
      expect(heap.pop()).toBe(4);
    }

    expect(heap.size).toBe(0);
  });

  it('gives a fixed order when the compare function breaks ties', () => {
    const tieHeap = new BinaryHeap<{ key: number; id: number }>(
      (a, b) => a.key - b.key || a.id - b.id,
    );

    for (const id of [4, 0, 3, 1, 2]) {
      tieHeap.push({ key: 1, id });
    }

    const ids: number[] = [];

    while (tieHeap.size > 0) {
      ids.push(tieHeap.pop().id);
    }

    expect(ids).toEqual([0, 1, 2, 3, 4]);
  });

  it('peeks at the first item without removing it', () => {
    heap.push(3);
    heap.push(1);
    heap.push(2);

    expect(heap.peek()).toBe(1);
    expect(heap.size).toBe(3);
    expect(heap.pop()).toBe(1);
    expect(heap.peek()).toBe(2);
  });

  it('tracks its size through pushes and pops', () => {
    heap.push(1);
    heap.push(2);
    expect(heap.size).toBe(2);

    heap.pop();
    expect(heap.size).toBe(1);

    heap.pop();
    expect(heap.size).toBe(0);
  });

  it('throws when popping or peeking an empty heap', () => {
    expect(() => heap.pop()).toThrow('it is empty');
    expect(() => heap.peek()).toThrow('it is empty');
  });

  it('is empty after clear', () => {
    heap.push(1);
    heap.push(2);
    heap.clear();

    expect(heap.size).toBe(0);
    expect(() => heap.pop()).toThrow('it is empty');
    expect(() => heap.peek()).toThrow('it is empty');

    heap.push(5);
    expect(heap.pop()).toBe(5);
  });

  it('matches a sorted array over many random pushes and pops', () => {
    const random = new Random('binary-heap');
    const expected: number[] = [];

    for (let i = 0; i < 5000; i++) {
      if (expected.length > 0 && random.randomFloat(0, 1) < 0.4) {
        expect(heap.peek()).toBe(expected[0]);
        expect(heap.pop()).toBe(expected.shift());
      } else {
        // A small range so plenty of values tie.
        const value = random.randomInt(0, 100);

        heap.push(value);
        expected.push(value);
        expected.sort(byNumber);
      }

      expect(heap.size).toBe(expected.length);
    }

    while (expected.length > 0) {
      expect(heap.pop()).toBe(expected.shift());
    }

    expect(heap.size).toBe(0);
  });
});
