import { bench, describe } from 'vitest';
import { Mat4 } from '../matrices/matrix4.js';
import { Random } from '../random.js';
import { randomVec3 } from '../test-helpers/index.js';
import { Vec3 } from '../vector3.js';
import { BoundingSphere } from './bounding-sphere.js';
import { Frustums } from './frustum.js';

const sizes = [100, 1_000, 10_000];

const viewProjection = Mat4.multiply(
  Mat4.perspective(Mat4.create(), 1.2, 16 / 9, 0.1, 100, 'negativeOneToOne'),
  Mat4.lookAt(Mat4.create(), { x: 0, y: 5, z: 20 }, Vec3.zero, Vec3.up),
);
const frustum = Frustums.fromViewProjection(
  Frustums.create(),
  viewProjection,
  'negativeOneToOne',
);

for (const size of sizes) {
  const random = new Random(`Frustums bench ${size}`);
  // Spread around the camera so about half are visible.
  const spheres: BoundingSphere[] = Array.from({ length: size }, () => ({
    center: randomVec3(random, -60, 60),
    radius: random.randomFloat(0.5, 3),
  }));
  let visible = 0;

  describe(`Frustums, ${size} spheres`, () => {
    bench('intersectsSphere', () => {
      visible = 0;

      for (let i = 0; i < size; i++) {
        visible += Frustums.intersectsSphere(frustum, spheres[i]) ? 1 : 0;
      }

      // Keeps the result observable so the loop isn't optimized away.
      if (visible < 0) {
        throw new Error('Unreachable');
      }
    });
  });
}
