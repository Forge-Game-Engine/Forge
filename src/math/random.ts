import seedrandom from 'seedrandom';

/**
 * The `Random` class provides methods to generate random integers and floats
 * using a seeded random number generator.
 */
export class Random {
  private readonly _rng: seedrandom.PRNG;

  /**
   * Creates a new instance of the `Random` class with the given seed. Two
   * instances created with the same seed produce the same sequence of values.
   * @param seed - The seed for the random number generator. Defaults to
   * `'seed'`, so instances created without a seed all produce the same
   * sequence.
   */
  constructor(seed: string = 'seed') {
    this._rng = seedrandom(seed);
  }

  /**
   * Generates a random integer between the specified minimum and maximum values (inclusive).
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (inclusive).
   * @returns A random integer between min and max.
   */
  public randomInt(min: number, max: number): number {
    return Math.floor(this._random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float from the specified minimum value (inclusive) up
   * to the maximum value (exclusive).
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (exclusive).
   * @returns A random float from `min` up to, but not including, `max`.
   */
  public randomFloat(min: number, max: number): number {
    return this._random() * (max - min) + min;
  }

  /**
   * Generates a random number between 0 (inclusive) and 1 (exclusive).
   * @returns A random number between 0 and 1.
   */
  private _random(): number {
    return this._rng();
  }
}
