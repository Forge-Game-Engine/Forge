import { describe, expect, it } from 'vitest';
import { compareNamesNaturally } from './compare-names-naturally.js';

const sorted = (names: string[]): string[] =>
  [...names].sort(compareNamesNaturally);

describe('compareNamesNaturally', () => {
  it('orders numbers by value', () => {
    expect(sorted(['run_10', 'run_2', 'run_1'])).toEqual([
      'run_1',
      'run_2',
      'run_10',
    ]);
  });

  it('orders numbers by value when an extension follows them', () => {
    expect(sorted(['run_10.png', 'run_9.png'])).toEqual([
      'run_9.png',
      'run_10.png',
    ]);
  });

  it('orders numbers in parentheses by value', () => {
    expect(sorted(['ship (10)', 'ship (2)'])).toEqual([
      'ship (2)',
      'ship (10)',
    ]);
  });

  it('orders zero-padded numbers by value, and ties by code unit', () => {
    expect(sorted(['run_10', 'run_1', 'run_02', 'run_01'])).toEqual([
      'run_01',
      'run_1',
      'run_02',
      'run_10',
    ]);
  });

  it('orders names with several numbers by each in turn', () => {
    expect(sorted(['a2_b10', 'a10_b1', 'a2_b9'])).toEqual([
      'a2_b9',
      'a2_b10',
      'a10_b1',
    ]);
  });

  it('compares numbers too long for a number exactly', () => {
    expect(
      sorted(['f_90071992547409930', 'f_90071992547409929', 'f_9']),
    ).toEqual(['f_9', 'f_90071992547409929', 'f_90071992547409930']);
  });

  it('is case-sensitive, ordering by code unit', () => {
    expect(sorted(['run_1', 'Run_1', 'run_0'])).toEqual([
      'Run_1',
      'run_0',
      'run_1',
    ]);
  });

  it('puts a name before longer names that start with it', () => {
    expect(sorted(['run_1_a', 'run_1', 'run'])).toEqual([
      'run',
      'run_1',
      'run_1_a',
    ]);
  });

  it('returns 0 only for equal names', () => {
    expect(compareNamesNaturally('run_1', 'run_1')).toBe(0);
    expect(compareNamesNaturally('', '')).toBe(0);
    expect(compareNamesNaturally('run_01', 'run_1')).not.toBe(0);
  });
});
