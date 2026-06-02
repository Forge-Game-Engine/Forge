import seedrandom from 'seedrandom';

/**
 * The `Random` class provides methods to generate random integers and floats
 * using a seeded random number generator.
 */
export class Random {
  private readonly _rng: seedrandom.PRNG;

  /**
   * Creates a new instance of the `Random` class with the given seed.
   * @param seed - The seed for the random number generator.
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
   * Generates a random float between the specified minimum and maximum values (inclusive).
   * @param min - The minimum value (inclusive).
   * @param max - The maximum value (inclusive).
   * @returns A random float between min and max.
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
