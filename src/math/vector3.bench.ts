import { bench, describe } from 'vitest';
import { Random } from './random.js';
import { randomUnitQuat, randomVec3 } from './test-helpers/index.js';
import { Vec3 } from './vector3.js';

const sizes = [100, 1_000, 10_000];

for (const size of sizes) {
  const random = new Random(`Vec3 bench ${size}`);
  const vectors = Array.from({ length: size }, () => randomVec3(random));
  const starts = vectors.map((vector) => Vec3.clone(vector));
  const rotations = Array.from({ length: size }, () => randomUnitQuat(random));

  describe(`Vec3, ${size} vectors`, () => {
    bench('rotate', () => {
      for (let i = 0; i < size; i++) {
        Vec3.rotate(Vec3.set(vectors[i], starts[i]), rotations[i]);
      }
    });
  });
}
