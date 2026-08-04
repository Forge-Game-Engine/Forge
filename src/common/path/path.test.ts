import { describe, expect, it } from 'vitest';
import { Path } from './path';

describe('Path', () => {
  it('should create an instance of Path', () => {
    const path = new Path();
    expect(path).toBeInstanceOf(Path);
    expect(path).toHaveLength(0);
  });

  it('should create an instance of Path with initial points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const path = new Path(points);
    expect(path).toHaveLength(2);
    expect(path.first).toEqual(points[0]);
    expect(path.last).toEqual(points[1]);
  });

  it('should get the point at the specified index', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const path = new Path(points);
    expect(path.at(0)).toEqual(points[0]);
    expect(path.at(1)).toEqual(points[1]);
  });

  it('should add a point to the end of the path', () => {
    const path = new Path();
    const point = { x: 2, y: 2 };
    path.push(point);
    expect(path).toHaveLength(1);
    expect(path.last).toEqual(point);
  });

  it('should map the path to a new array using the provided callback function', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const path = new Path(points);
    const pointStrings = path.map((point) => `[${point.x},${point.y}]`);
    expect(pointStrings).toEqual(['[0,0]', '[1,1]']);
  });

  it('should return an iterator for the path', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const path = new Path(points);
    const iterator = path[Symbol.iterator]();
    expect(iterator.next().value).toEqual(points[0]);
    expect(iterator.next().value).toEqual(points[1]);
    expect(iterator.next().done).toBe(true);
  });
});
