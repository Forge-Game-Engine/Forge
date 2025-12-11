import { describe, expect, it, vi } from 'vitest';
import { Transition } from './transition.js';

describe('Transition', () => {
  it('constructor assigns predicates', () => {
    const predicate = () => true;
    const transition = new Transition<number>(predicate);

    expect(transition.predicates).toEqual([predicate]);
  });

  it('satisfies returns true when all predicates return true and passes input through', () => {
    const p1 = vi.fn((input: number) => input > 5);
    const p2 = vi.fn((input: number) => input < 10);
    const transition = new Transition<number>(p1, p2);

    const result = transition.satisfies(7);

    expect(result).toBe(true);
    expect(p1).toHaveBeenCalledWith(7);
    expect(p2).toHaveBeenCalledWith(7);
  });

  it('satisfies returns false if any predicate returns false and does not call later predicates', () => {
    const p1 = vi.fn((input: number) => input > 5);
    const p2 = vi.fn((input: number) => input < 10);
    const transition = new Transition<number>(p1, p2);

    const result = transition.satisfies(3);

    expect(result).toBe(false);
    expect(p1).toHaveBeenCalledWith(3);
    expect(p2).not.toHaveBeenCalled();
  });

  it('satisfies returns true when there are no predicates (empty array)', () => {
    const transition = new Transition<number>();

    const result = transition.satisfies(3);

    expect(result).toBe(true);
  });
});
