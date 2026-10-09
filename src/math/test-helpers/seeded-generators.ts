import type { BoundingBox } from '../geometry/bounding-box.js';
import type { Ray } from '../geometry/ray.js';
import { Mat4, Matrix4 } from '../matrices/matrix4.js';
import { Quat, Quaternion } from '../quaternion.js';
import { Random } from '../random.js';
import { Vec3, Vector3 } from '../vector3.js';

/** How many seeded cases a property test runs by default. */
export const defaultPropertyCases = 1000;

/**
 * Runs a property test over seeded random cases. Each case gets its own
 * `Random`, seeded from `name` and the case number, so a failing case
 * reruns identically. A failure is rethrown with its seed in the message.
 * @param name - The property's name, the base of each case's seed.
 * @param property - The check to run, which throws (or fails an
 * assertion) when the property doesn't hold.
 * @param cases - How many cases to run.
 */
export const forEachSeededCase = (
  name: string,
  property: (random: Random) => void,
  cases: number = defaultPropertyCases,
): void => {
  for (let index = 0; index < cases; index++) {
    const seed = `${name}#${index}`;

    try {
      property(new Random(seed));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Property failed for seed "${seed}": ${message}`, {
        cause: error,
      });
    }
  }
};

/**
 * Creates a vector with each component uniform in `[min, max)`.
 * @param random - The seeded generator.
 * @param min - The smallest component.
 * @param max - The largest component (exclusive).
 * @returns A new vector.
 */
export const randomVec3 = (
  random: Random,
  min: number = -100,
  max: number = 100,
): Vector3 => ({
  x: random.randomFloat(min, max),
  y: random.randomFloat(min, max),
  z: random.randomFloat(min, max),
});

/**
 * Creates a unit vector with a uniformly distributed direction.
 * @param random - The seeded generator.
 * @returns A new unit vector.
 */
export const randomUnitVec3 = (random: Random): Vector3 => {
  const z = random.randomFloat(-1, 1);
  const angle = random.randomFloat(0, Math.PI * 2);
  const radius = Math.sqrt(1 - z * z);

  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z };
};

/**
 * Creates a unit quaternion with a uniformly distributed rotation.
 * @param random - The seeded generator.
 * @returns A new unit quaternion.
 */
export const randomUnitQuat = (random: Random): Quaternion => {
  // Shoemake's method for uniform random rotations.
  const u1 = random.randomFloat(0, 1);
  const u2 = random.randomFloat(0, Math.PI * 2);
  const u3 = random.randomFloat(0, Math.PI * 2);
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);

  return Quat.normalize({
    x: a * Math.sin(u2),
    y: a * Math.cos(u2),
    z: b * Math.sin(u3),
    w: b * Math.cos(u3),
  });
};

/**
 * Creates a non-uniform scale with each component's magnitude in `[0.1,
 * 10)` and, when `allowNegative` is `true`, a random sign.
 * @param random - The seeded generator.
 * @param allowNegative - Whether components may be negative.
 * @returns A new scale vector.
 */
export const randomScale = (
  random: Random,
  allowNegative: boolean,
): Vector3 => {
  const component = (): number => {
    const magnitude = Math.exp(random.randomFloat(Math.log(0.1), Math.log(10)));

    return allowNegative && random.randomFloat(0, 1) < 0.5
      ? -magnitude
      : magnitude;
  };

  return { x: component(), y: component(), z: component() };
};

/**
 * A random transform's parts and the affine matrix built from them.
 */
export interface RandomTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  matrix: Matrix4;
}

/**
 * Creates a random affine transform with non-uniform scale.
 * @param random - The seeded generator.
 * @param allowNegativeScale - Whether scale components may be negative.
 * @returns The transform's position, rotation and scale, and its matrix.
 */
export const randomTransform = (
  random: Random,
  allowNegativeScale: boolean = false,
): RandomTransform => {
  const position = randomVec3(random);
  const rotation = randomUnitQuat(random);
  const scale = randomScale(random, allowNegativeScale);
  const matrix = Mat4.fromTransform(Mat4.create(), position, rotation, scale);

  return { position, rotation, scale, matrix };
};

/**
 * Creates a ray with a random origin and a uniformly distributed direction.
 * @param random - The seeded generator.
 * @param extent - The largest absolute value of each origin component.
 * @returns A new ray.
 */
export const randomRay = (random: Random, extent: number = 10): Ray => ({
  origin: randomVec3(random, -extent, extent),
  direction: randomUnitVec3(random),
});

/**
 * Creates a non-empty box inside `[-extent, extent)` on each axis.
 * @param random - The seeded generator.
 * @param extent - The largest absolute value of each coordinate.
 * @returns A new box.
 */
export const randomBox = (random: Random, extent: number = 10): BoundingBox => {
  const a = randomVec3(random, -extent, extent);
  const b = randomVec3(random, -extent, extent);

  return {
    min: Vec3.min(Vec3.clone(a), b),
    max: Vec3.max(a, b),
  };
};
