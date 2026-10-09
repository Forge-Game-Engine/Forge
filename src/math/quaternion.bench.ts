import { bench, describe } from 'vitest';
import { Quat, Quaternion } from './quaternion.js';
import { Random } from './random.js';
import { randomUnitQuat } from './test-helpers/index.js';

const sizes = [100, 1_000, 10_000];

const createQuaternions = (random: Random, count: number): Quaternion[] =>
  Array.from({ length: count }, () => randomUnitQuat(random));

for (const size of sizes) {
  const random = new Random(`Quat bench ${size}`);
  const targets = createQuaternions(random, size);
  const values = createQuaternions(random, size);
  const starts = targets.map((quaternion) => Quat.clone(quaternion));

  describe(`Quat, ${size} quaternions`, () => {
    bench('multiply', () => {
      for (let i = 0; i < size; i++) {
        Quat.multiply(Quat.set(targets[i], starts[i]), values[i]);
      }
    });

    bench('slerp', () => {
      for (let i = 0; i < size; i++) {
        Quat.slerp(Quat.set(targets[i], starts[i]), values[i], 0.3);
      }
    });
  });
}
