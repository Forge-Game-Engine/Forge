import { Vector2 } from 'forge/math';

type MapPathCallback<T> = (point: Vector2, index: number, path: Vector2[]) => T;

/**
 * Class to represent a path consisting of a series of 2D points.
 */
export class Path implements Iterable<Vector2> {
  public path: Vector2[];

  /**
   * Creates an instance of Path.
   * @param path - An array of Vector2 points representing the path.
   * @example
   * const path = new Path([new Vector2(0, 0), new Vector2(1, 1)]);
   * console.log(path.length); // 2
   */
  constructor(path: Vector2[] = []) {
    this.path = path;
  }

  /**
   * Gets the point at the specified index.
   * @param index - The index of the point to retrieve.
   * @returns The point at the specified index.
   */
  public at(index: number): Vector2 {
    const point = this.path[index];

    if (!point) {
      throw new Error(`Path index out of bounds: ${index}`);
    }

    return point;
  }

  /**
   * Adds a point to the end of the path.
   * @param point - The point to add.
   */
  public push(point: Vector2): void {
    this.path.push(point);
  }

  /**
   * Maps the path to a new array using the provided callback function.
   * @param callback - The callback function to apply to each point.
   * @returns A new array with the results of calling the callback on each point.
   * @example
   * const pointStrings = path.map(point => `[${point.x},${point.y}]`);
   * console.log(pointStrings); // ['[0,0]', '[1,1]']
   */
  public map<T>(callback: MapPathCallback<T>): T[] {
    return this.path.map(callback);
  }

  /**
   * Gets the first point in the path.
   * @returns The first point in the path.
   */
  get first(): Vector2 {
    return this.at(0);
  }

  /**
   * Gets the last point in the path.
   * @returns The last point in the path.
   */
  get last(): Vector2 | null {
    return this.path.at(-1) ?? null;
  }

  /**
   * Gets the number of points in the path.
   * @returns The number of points in the path.
   */
  get length(): number {
    return this.path.length;
  }

  /**
   * Returns an iterator for the path.
   * @returns An iterator for the path.
   * @example
   * for (const point of path) {
   *   console.log(point);
   * }
   */
  public [Symbol.iterator](): Iterator<Vector2> {
    let index = 0;
    const path = this.path;

    return {
      next(): IteratorResult<Vector2> {
        if (index < path.length) {
          return { value: path[index++], done: false };
        }

        return { done: true } as IteratorResult<Vector2>;
      },
    };
  }
}
