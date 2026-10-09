/**
 * Compares the two candidate storages for `Matrix4`: a plain `number[]`
 * created from a literal (stored as packed doubles) and a `Float64Array`.
 * Both sides run the same hand-written code, so the difference is the
 * storage: how fast one is created, and how fast `multiplyAffine` reads and
 * writes it.
 */
import { bench, describe } from 'vitest';
import { Random } from '../random.js';
import { randomTransform } from '../test-helpers/index.js';
import { Mat4, Matrix4 } from './matrix4.js';

const sizes = [100, 1_000, 10_000];

const createFloat64Identity = (): Float64Array => {
  const matrix = new Float64Array(16);

  matrix[0] = 1;
  matrix[5] = 1;
  matrix[10] = 1;
  matrix[15] = 1;

  return matrix;
};

/** `Mat4.multiplyAffine`'s body, for a `Float64Array`. */
const multiplyAffineFloat64 = (
  out: Float64Array,
  a: Float64Array,
  b: Float64Array,
): Float64Array => {
  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a30 = a[12];
  const a31 = a[13];
  const a32 = a[14];
  const b00 = b[0];
  const b01 = b[1];
  const b02 = b[2];
  const b10 = b[4];
  const b11 = b[5];
  const b12 = b[6];
  const b20 = b[8];
  const b21 = b[9];
  const b22 = b[10];
  const b30 = b[12];
  const b31 = b[13];
  const b32 = b[14];

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = 0;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = 0;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = 0;
  out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30;
  out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31;
  out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32;
  out[15] = 1;

  return out;
};

for (const size of sizes) {
  const random = new Random(`matrix storage bench ${size}`);
  const packed: Matrix4[] = [];
  const typed: Float64Array[] = [];

  for (let i = 0; i < size; i++) {
    const { matrix } = randomTransform(random);

    packed.push(matrix);
    typed.push(Float64Array.from(matrix));
  }

  const packedOutputs = packed.map(() => Mat4.create());
  const typedOutputs = typed.map(() => createFloat64Identity());
  const packedParent = packed[0];
  const typedParent = typed[0];
  let created: unknown[] = [];

  describe(`Matrix4 storage, create ${size}`, () => {
    bench('number[] (packed doubles)', () => {
      created = new Array<unknown>(size);

      for (let i = 0; i < size; i++) {
        created[i] = Mat4.create();
      }
    });

    bench('Float64Array', () => {
      created = new Array<unknown>(size);

      for (let i = 0; i < size; i++) {
        created[i] = createFloat64Identity();
      }
    });
  });

  describe(`Matrix4 storage, multiplyAffine ${size}`, () => {
    bench('number[] (packed doubles)', () => {
      for (let i = 0; i < size; i++) {
        Mat4.multiplyAffine(
          Mat4.copy(packedOutputs[i], packedParent),
          packed[i],
        );
      }
    });

    bench('Float64Array', () => {
      for (let i = 0; i < size; i++) {
        const out = typedOutputs[i];

        // Copied the way Mat4.copy copies, so only the storage differs.
        for (let j = 0; j < 16; j++) {
          out[j] = typedParent[j];
        }

        multiplyAffineFloat64(out, out, typed[i]);
      }
    });
  });

  // Keeps the created matrices observable so creation isn't optimized away.
  if (created.length > size) {
    throw new Error('Unreachable');
  }
}
