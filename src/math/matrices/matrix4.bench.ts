import { bench, describe } from 'vitest';
import { Quat, Quaternion } from '../quaternion.js';
import { Random } from '../random.js';
import { randomTransform } from '../test-helpers/index.js';
import { Vec3, Vector3 } from '../vector3.js';
import { Mat4, Matrix4 } from './matrix4.js';

const sizes = [100, 1_000, 10_000];

interface Transforms {
  positions: Vector3[];
  rotations: Quaternion[];
  scales: Vector3[];
  matrices: Matrix4[];
  outputs: Matrix4[];
}

const createTransforms = (count: number): Transforms => {
  const random = new Random(`Mat4 bench ${count}`);
  const transforms: Transforms = {
    positions: [],
    rotations: [],
    scales: [],
    matrices: [],
    outputs: [],
  };

  for (let i = 0; i < count; i++) {
    const { position, rotation, scale, matrix } = randomTransform(random);

    transforms.positions.push(position);
    transforms.rotations.push(rotation);
    transforms.scales.push(scale);
    transforms.matrices.push(matrix);
    transforms.outputs.push(Mat4.create());
  }

  return transforms;
};

for (const size of sizes) {
  const transforms = createTransforms(size);
  const { positions, rotations, scales, matrices, outputs } = transforms;
  const parent = matrices[0];
  const outPosition = Vec3.zero;
  const outRotation = Quat.identity;
  const outScale = Vec3.zero;

  describe(`Mat4, ${size} matrices`, () => {
    bench('fromTransform', () => {
      for (let i = 0; i < size; i++) {
        Mat4.fromTransform(outputs[i], positions[i], rotations[i], scales[i]);
      }
    });

    bench('multiplyAffine', () => {
      for (let i = 0; i < size; i++) {
        Mat4.multiplyAffine(Mat4.copy(outputs[i], parent), matrices[i]);
      }
    });

    bench('multiply', () => {
      for (let i = 0; i < size; i++) {
        Mat4.multiply(Mat4.copy(outputs[i], parent), matrices[i]);
      }
    });

    bench('invert', () => {
      for (let i = 0; i < size; i++) {
        Mat4.invert(outputs[i], matrices[i]);
      }
    });

    bench('invertAffine', () => {
      for (let i = 0; i < size; i++) {
        Mat4.invertAffine(outputs[i], matrices[i]);
      }
    });

    bench('decompose', () => {
      for (let i = 0; i < size; i++) {
        Mat4.decompose(outPosition, outRotation, outScale, matrices[i]);
      }
    });
  });
}
