/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable require-await */
import { describe, expect, it, vi } from 'vitest';
import { Chain } from './chain';

describe('Chain', () => {
  it('runs a single synchronous function', async () => {
    const chain = new Chain(2).add((x) => x + 3);

    const result = await chain.collapse();
    expect(result).toBe(5);
  });

  it('runs multiple synchronous functions in order', async () => {
    const chain = new Chain(1).add((x) => x + 2).add((x) => x * 4);

    const result = await chain.collapse();
    expect(result).toBe(12); // (1 + 2) * 4 = 12
  });

  it('supports asynchronous functions', async () => {
    const chain = new Chain(3).add(async (x) => x * 2).add((x) => x + 1);

    const result = await chain.collapse();
    expect(result).toBe(7); // (3 * 2) + 1 = 7
  });

  it('handles mixed sync and async functions', async () => {
    const chain = new Chain('a')
      .add((x) => x + 'b')
      .add(async (x) => x + 'c')
      .add((x) => x + 'd');

    const result = await chain.collapse();
    expect(result).toBe('abcd');
  });

  it('passes the correct types through the chain', async () => {
    const chain = new Chain(5)
      .add((x) => x.toString())
      .add((x) => x + ' apples');

    const result = await chain.collapse();
    expect(result).toBe('5 apples');
  });

  it('returns the initial state if no functions are added', async () => {
    const chain = new Chain(true);
    const result = await chain.collapse();
    expect(result).toBe(true);
  });

  it('calls all functions in order with correct arguments', async () => {
    const fn1 = vi.fn((x: number) => x + 1);
    const fn2 = vi.fn((x: number) => x * 2);

    const chain = new Chain(10).add(fn1).add(fn2);

    const result = await chain.collapse();
    expect(fn1).toHaveBeenCalledWith(10);
    expect(fn2).toHaveBeenCalledWith(11);
    expect(result).toBe(22);
  });
});
