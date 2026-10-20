import { describe, expect, it } from 'vitest';
import { Vector2 } from '../../math/index.js';
import { packTile } from './packed-tile.js';
import { getTileTransformBits } from './packed-tile-bits.js';
import { applyTileTransform, invertTileTransform } from './tile-transform.js';

type PointMap = (u: number, v: number) => [number, number];

interface Orientation {
  name: string;
  transpose: boolean;
  flipX: boolean;
  flipY: boolean;
  movesTo: PointMap;
  samples: PointMap;
}

// The table of the eight orientations: where content moves to, and which
// point of the untransformed image a point of the transformed one samples.
const orientations: Orientation[] = [
  {
    name: 'as drawn',
    transpose: false,
    flipX: false,
    flipY: false,
    movesTo: (u, v) => [u, v],
    samples: (u, v) => [u, v],
  },
  {
    name: 'mirrored left to right',
    transpose: false,
    flipX: true,
    flipY: false,
    movesTo: (u, v) => [1 - u, v],
    samples: (u, v) => [1 - u, v],
  },
  {
    name: 'mirrored top to bottom',
    transpose: false,
    flipX: false,
    flipY: true,
    movesTo: (u, v) => [u, 1 - v],
    samples: (u, v) => [u, 1 - v],
  },
  {
    name: 'turned 180 degrees',
    transpose: false,
    flipX: true,
    flipY: true,
    movesTo: (u, v) => [1 - u, 1 - v],
    samples: (u, v) => [1 - u, 1 - v],
  },
  {
    name: 'turned 90 degrees clockwise',
    transpose: true,
    flipX: true,
    flipY: false,
    movesTo: (u, v) => [1 - v, u],
    samples: (u, v) => [v, 1 - u],
  },
  {
    name: 'turned 90 degrees counter-clockwise',
    transpose: true,
    flipX: false,
    flipY: true,
    movesTo: (u, v) => [v, 1 - u],
    samples: (u, v) => [1 - v, u],
  },
  {
    name: 'mirrored across the top-left/bottom-right line',
    transpose: true,
    flipX: false,
    flipY: false,
    movesTo: (u, v) => [v, u],
    samples: (u, v) => [v, u],
  },
  {
    name: 'mirrored across the top-right/bottom-left line',
    transpose: true,
    flipX: true,
    flipY: true,
    movesTo: (u, v) => [1 - v, 1 - u],
    samples: (u, v) => [1 - v, 1 - u],
  },
];

// The corners, plus a point no two orientations map to the same place,
// whose coordinates are exact in binary so `1 - (1 - v)` is `v`.
const points: Vector2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: 0.25, y: 0.125 },
];

const bitsOf = (orientation: Orientation): number =>
  getTileTransformBits(packTile({ source: 0, tile: 0, ...orientation }));

const map = (
  transform: typeof applyTileTransform,
  bits: number,
  point: Vector2,
): [number, number] => {
  const { x, y } = transform(bits, point, { x: 0, y: 0 });

  return [x, y];
};

describe('applyTileTransform and invertTileTransform', () => {
  it.each(orientations)(
    '$name: content moves the way the table says',
    (orientation) => {
      const bits = bitsOf(orientation);

      for (const point of points) {
        expect(map(applyTileTransform, bits, point)).toEqual(
          orientation.movesTo(point.x, point.y),
        );
      }
    },
  );

  it.each(orientations)(
    '$name: screen points sample the way the table says',
    (orientation) => {
      const bits = bitsOf(orientation);

      for (const point of points) {
        expect(map(invertTileTransform, bits, point)).toEqual(
          orientation.samples(point.x, point.y),
        );
      }
    },
  );

  it('turns content clockwise for transpose and flip X', () => {
    const bits = bitsOf(orientations[4]);

    // The image's top-left content lands at its top-right corner...
    expect(map(applyTileTransform, bits, { x: 0, y: 0 })).toEqual([1, 0]);
    // ...and the screen's top-left corner shows the image's bottom-left.
    expect(map(invertTileTransform, bits, { x: 0, y: 0 })).toEqual([0, 1]);
  });

  it('turns content counter-clockwise for transpose and flip Y', () => {
    const bits = bitsOf(orientations[5]);

    expect(map(applyTileTransform, bits, { x: 0, y: 0 })).toEqual([0, 1]);
    expect(map(invertTileTransform, bits, { x: 0, y: 0 })).toEqual([1, 0]);
  });

  it.each(orientations)(
    '$name: the two maps undo each other',
    (orientation) => {
      const bits = bitsOf(orientation);

      for (const point of points) {
        const there = applyTileTransform(bits, point, { x: 0, y: 0 });
        const back = invertTileTransform(bits, point, { x: 0, y: 0 });

        expect(map(invertTileTransform, bits, there)).toEqual([
          point.x,
          point.y,
        ]);
        expect(map(applyTileTransform, bits, back)).toEqual([point.x, point.y]);
      }
    },
  );

  it.each(orientations)(
    '$name: sampling a 2 x 2 image gives the image with its texels moved',
    (orientation) => {
      const bits = bitsOf(orientation);
      const image = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      const texelCenter = (index: number): number => (index + 0.5) / 2;
      const texelAt = (point: Vector2): number => Math.floor(point.x * 2);
      const rowAt = (point: Vector2): number => Math.floor(point.y * 2);

      const sampled = [0, 1].map((row) =>
        [0, 1].map((column) => {
          const source = invertTileTransform(
            bits,
            { x: texelCenter(column), y: texelCenter(row) },
            { x: 0, y: 0 },
          );

          return image[rowAt(source)][texelAt(source)];
        }),
      );

      const moved = [
        ['', ''],
        ['', ''],
      ];

      for (const row of [0, 1]) {
        for (const column of [0, 1]) {
          const target = applyTileTransform(
            bits,
            { x: texelCenter(column), y: texelCenter(row) },
            { x: 0, y: 0 },
          );

          moved[rowAt(target)][texelAt(target)] = image[row][column];
        }
      }

      expect(sampled).toEqual(moved);
    },
  );

  it('writes into the point it reads, when given as out', () => {
    const point = { x: 0.25, y: 0.125 };

    applyTileTransform(bitsOf(orientations[4]), point, point);

    expect(point).toEqual({ x: 0.875, y: 0.25 });
  });
});
