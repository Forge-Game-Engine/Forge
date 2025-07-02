import { beforeEach, describe, expect, it } from 'vitest';
import { InputAxis2d } from './input-axis-2d';
import { Vector2 } from '../../math';

describe('InputAxis2d', () => {
  let axis: InputAxis2d;

  beforeEach(() => {
    axis = new InputAxis2d('pan');
    axis.reset();
  });

  it('should initialize with the given name', () => {
    expect(axis.name).toBe('pan');
  });

  it('should initialize value to zero vector', () => {
    expect(axis.value.x).toBe(0);
    expect(axis.value.y).toBe(0);
  });

  it('should set value using two numbers', () => {
    axis.set(3, 4);

    expect(axis.value.x).toBe(3);
    expect(axis.value.y).toBe(4);
  });

  it('should set value using a Vector2', () => {
    const vector = new Vector2(7, 8);
    axis.set(vector);

    expect(axis.value.x).toBe(7);
    expect(axis.value.y).toBe(8);
  });

  it('should reset value to zero', () => {
    axis.set(5, 6);
    axis.reset();

    expect(axis.value.x).toBe(0);
    expect(axis.value.y).toBe(0);
  });

  it('should update value when set multiple times', () => {
    axis.set(1, 2);

    expect(axis.value.x).toBe(1);
    expect(axis.value.y).toBe(2);

    axis.set(new Vector2(-1, -2));

    expect(axis.value.x).toBe(-1);
    expect(axis.value.y).toBe(-2);
  });
});
