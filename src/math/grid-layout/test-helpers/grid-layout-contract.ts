import { describe, expect, it } from 'vitest';
import {
  calculateArea,
  calculateSignedArea,
} from '../../../physics/colliders/polygon-math.js';
import { Random } from '../../random.js';
import { Rect } from '../../rect.js';
import { Vec2, Vector2 } from '../../vector2.js';
import { GridCell, GridCellRange, GridLayout } from '../grid-layout.js';

/**
 * Creates the layout under test for a cell size.
 */
export type CreateGridLayout = (options: {
  cellWidth: number;
  cellHeight: number;
}) => GridLayout;

/**
 * The cell sizes every layout is checked with: a 2:1 tile, a square, sizes
 * that don't divide evenly and fractional sizes.
 */
const cellSizes = [
  { cellWidth: 64, cellHeight: 32 },
  { cellWidth: 32, cellHeight: 32 },
  { cellWidth: 30, cellHeight: 17 },
  { cellWidth: 0.5, cellHeight: 0.25 },
];

const cellsIn = (min: number, max: number): GridCell[] => {
  const cells: GridCell[] = [];

  for (let row = min; row <= max; row++) {
    for (let column = min; column <= max; column++) {
      cells.push({ column, row });
    }
  }

  return cells;
};

const rangeContains = (range: GridCellRange, cell: GridCell): boolean =>
  cell.column >= range.minColumn &&
  cell.column <= range.maxColumn &&
  cell.row >= range.minRow &&
  cell.row <= range.maxRow;

const rectPolygon = (rect: Rect): Vector2[] => [
  { x: rect.min.x, y: rect.min.y },
  { x: rect.max.x, y: rect.min.y },
  { x: rect.max.x, y: rect.max.y },
  { x: rect.min.x, y: rect.max.y },
];

/**
 * Checks whether two convex polygons overlap with positive area: they do
 * unless one of their edge normals separates them, touching included.
 */
const convexPolygonsOverlap = (a: Vector2[], b: Vector2[]): boolean => {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const edge = Vec2.subtract(
        Vec2.clone(polygon[(i + 1) % polygon.length]),
        polygon[i],
      );
      const axis = Vec2.perpendicular(edge);
      const projectA = a.map((vertex) => Vec2.dot(vertex, axis));
      const projectB = b.map((vertex) => Vec2.dot(vertex, axis));

      if (
        Math.max(...projectA) <= Math.min(...projectB) ||
        Math.max(...projectB) <= Math.min(...projectA)
      ) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Compares two cells by their position in row-major order, with cells
 * grouped into `chunkSize` by `chunkSize` chunks first when one is given.
 */
const compareDrawOrder = (
  a: GridCell,
  b: GridCell,
  chunkSize?: number,
): number => {
  if (chunkSize !== undefined) {
    const chunkRowDifference =
      Math.floor(a.row / chunkSize) - Math.floor(b.row / chunkSize);
    const chunkColumnDifference =
      Math.floor(a.column / chunkSize) - Math.floor(b.column / chunkSize);

    if (chunkRowDifference !== 0) {
      return chunkRowDifference;
    }

    if (chunkColumnDifference !== 0) {
      return chunkColumnDifference;
    }
  }

  return a.row - b.row || a.column - b.column;
};

/**
 * Runs the property tests every `GridLayout` passes, for each of several
 * cell sizes.
 * @param name - The name of the factory under test, which its errors start
 * with.
 * @param createLayout - Creates the layout under test.
 * @param cellArea - The area of one cell's footprint for a cell size.
 */
export function describeGridLayoutContract(
  name: string,
  createLayout: CreateGridLayout,
  cellArea: (cellSize: { cellWidth: number; cellHeight: number }) => number,
): void {
  describe(`${name} GridLayout contract`, () => {
    for (const cellSize of cellSizes) {
      describe(`${cellSize.cellWidth} x ${cellSize.cellHeight}`, () => {
        const layout = createLayout(cellSize);

        it('keeps the cell size it was given', () => {
          expect(layout.cellWidth).toBe(cellSize.cellWidth);
          expect(layout.cellHeight).toBe(cellSize.cellHeight);
        });

        it('maps every cell center back to its cell, negative cells included', () => {
          for (const cell of cellsIn(-5, 5)) {
            const center = layout.getCellCenter(cell.column, cell.row);

            expect(layout.localToCell(center)).toEqual(cell);
          }
        });

        it('puts the cell center at the middle of the footprint bounds', () => {
          for (const { column, row } of cellsIn(-2, 2)) {
            const center = layout.getCellCenter(column, row);
            const bounds = layout.getCellFootprintBounds(column, row);

            expect(center.x).toBeCloseTo((bounds.min.x + bounds.max.x) / 2);
            expect(center.y).toBeCloseTo((bounds.min.y + bounds.max.y) / 2);
          }
        });

        it('puts each polygon corner and edge midpoint in the one cell that owns it', () => {
          for (const { column, row } of cellsIn(-3, 3)) {
            const [first, second, third, fourth] = layout.getCellPolygon(
              column,
              row,
            );

            // The cell owns the corner at its cell-space origin and the two
            // edges that leave it; each other corner belongs to the cell
            // whose cell-space origin it is.
            expect(layout.localToCell(first)).toEqual({ column, row });
            expect(layout.localToCell(second)).toEqual({
              column: column + 1,
              row,
            });
            expect(layout.localToCell(third)).toEqual({
              column: column + 1,
              row: row + 1,
            });
            expect(layout.localToCell(fourth)).toEqual({
              column,
              row: row + 1,
            });

            const midpoint = (a: Vector2, b: Vector2): Vector2 => ({
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
            });

            expect(layout.localToCell(midpoint(first, second))).toEqual({
              column,
              row,
            });
            expect(layout.localToCell(midpoint(fourth, first))).toEqual({
              column,
              row,
            });
            expect(layout.localToCell(midpoint(second, third))).toEqual({
              column: column + 1,
              row,
            });
            expect(layout.localToCell(midpoint(third, fourth))).toEqual({
              column,
              row: row + 1,
            });
          }
        });

        it('puts points just either side of an edge in the cells on those sides', () => {
          const nudge = 1e-6;

          for (const { column, row } of cellsIn(-3, 3)) {
            const insideTop = layout.cellSpaceToLocal({
              x: column + 0.5,
              y: row + nudge,
            });
            const outsideTop = layout.cellSpaceToLocal({
              x: column + 0.5,
              y: row - nudge,
            });
            const insideLeft = layout.cellSpaceToLocal({
              x: column + nudge,
              y: row + 0.5,
            });
            const outsideLeft = layout.cellSpaceToLocal({
              x: column - nudge,
              y: row + 0.5,
            });

            expect(layout.localToCell(insideTop)).toEqual({ column, row });
            expect(layout.localToCell(outsideTop)).toEqual({
              column,
              row: row - 1,
            });
            expect(layout.localToCell(insideLeft)).toEqual({ column, row });
            expect(layout.localToCell(outsideLeft)).toEqual({
              column: column - 1,
              row,
            });
          }
        });

        it('round-trips points through cell space', () => {
          const random = new Random('cell-space');

          for (let i = 0; i < 200; i++) {
            const extent = i < 100 ? 500 : 1e6;
            const point = {
              x: random.randomFloat(-extent, extent),
              y: random.randomFloat(-extent, extent),
            };
            const roundTripped = layout.cellSpaceToLocal(
              layout.localToCellSpace(point),
            );
            const tolerance = 1e-9 * Math.max(1, Vec2.magnitude(point));

            expect(Math.abs(roundTripped.x - point.x)).toBeLessThan(tolerance);
            expect(Math.abs(roundTripped.y - point.y)).toBeLessThan(tolerance);
          }
        });

        it('maps cell-space integer points to the polygon corners', () => {
          expect(layout.cellSpaceToLocal({ x: 2, y: -3 })).toEqual(
            layout.getCellPolygon(2, -3)[0],
          );
          expect(
            layout.localToCellSpace(layout.getCellPolygon(2, -3)[0]),
          ).toEqual({ x: 2, y: -3 });
        });

        it('returns a positive, clockwise polygon of the expected area, inside its footprint bounds', () => {
          const expectedArea = cellArea(cellSize);

          for (const { column, row } of cellsIn(-2, 2)) {
            const polygon = layout.getCellPolygon(column, row);
            const bounds = layout.getCellFootprintBounds(column, row);

            expect(polygon).toHaveLength(4);
            expect(polygon[0]).toEqual(
              layout.cellSpaceToLocal({ x: column, y: row }),
            );
            // The shoelace sum is positive for a polygon that turns `+X`
            // towards `+Y`: clockwise on screen.
            expect(calculateSignedArea(polygon)).toBeGreaterThan(0);
            expect(calculateArea(polygon)).toBeCloseTo(expectedArea);

            for (const corner of polygon) {
              expect(corner.x).toBeGreaterThanOrEqual(bounds.min.x);
              expect(corner.x).toBeLessThanOrEqual(bounds.max.x);
              expect(corner.y).toBeGreaterThanOrEqual(bounds.min.y);
              expect(corner.y).toBeLessThanOrEqual(bounds.max.y);
            }

            const xs = polygon.map((corner) => corner.x);
            const ys = polygon.map((corner) => corner.y);

            expect(xs).toContain(bounds.min.x);
            expect(xs).toContain(bounds.max.x);
            expect(ys).toContain(bounds.min.y);
            expect(ys).toContain(bounds.max.y);
            expect(bounds.max.x - bounds.min.x).toBeCloseTo(layout.cellWidth);
            expect(bounds.max.y - bounds.min.y).toBeCloseTo(layout.cellHeight);
          }
        });

        it('computes shared corners of neighboring cells identically', () => {
          for (const offset of [-1000, 0, 1000]) {
            for (const { column, row } of cellsIn(offset - 1, offset + 1)) {
              const [topLeft, topRight, bottomRight, bottomLeft] =
                layout.getCellPolygon(column, row);
              const right = layout.getCellPolygon(column + 1, row);
              const below = layout.getCellPolygon(column, row + 1);
              const diagonal = layout.getCellPolygon(column + 1, row + 1);

              expect(right[0]).toEqual(topRight);
              expect(right[3]).toEqual(bottomRight);
              expect(below[0]).toEqual(bottomLeft);
              expect(below[1]).toEqual(bottomRight);
              expect(diagonal[0]).toEqual(bottomRight);
              expect(Object.is(right[0].x, topRight.x)).toBe(true);
              expect(Object.is(right[0].y, topRight.y)).toBe(true);
              expect(topLeft).toEqual(
                layout.cellSpaceToLocal({ x: column, y: row }),
              );
            }
          }
        });

        it('returns a range holding every cell a rect reaches, and no larger', () => {
          const random = new Random('cell-range');
          const extent = 4 * Math.max(layout.cellWidth, layout.cellHeight);
          const rects: Rect[] = [];

          for (let i = 0; i < 40; i++) {
            const a = {
              x: random.randomFloat(-extent, extent),
              y: random.randomFloat(-extent, extent),
            };
            const b =
              i % 4 === 0
                ? a
                : {
                    x: random.randomFloat(-extent, extent),
                    y: random.randomFloat(-extent, extent),
                  };

            rects.push({
              min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
              max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
            });
          }

          // Rects whose corners sit exactly on cell corners.
          for (let i = 0; i < 20; i++) {
            const a = layout.cellSpaceToLocal({
              x: random.randomInt(-4, 4),
              y: random.randomInt(-4, 4),
            });
            const b = layout.cellSpaceToLocal({
              x: random.randomInt(-4, 4),
              y: random.randomInt(-4, 4),
            });

            rects.push({
              min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
              max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
            });
          }

          const samples = 24;

          for (const rect of rects) {
            const range = layout.getCellRangeForLocalRect(rect);
            const reached = {
              minColumn: Infinity,
              minRow: Infinity,
              maxColumn: -Infinity,
              maxRow: -Infinity,
            };

            for (let i = 0; i <= samples; i++) {
              for (let j = 0; j <= samples; j++) {
                const point = {
                  x: rect.min.x + ((rect.max.x - rect.min.x) * i) / samples,
                  y: rect.min.y + ((rect.max.y - rect.min.y) * j) / samples,
                };
                const cell = layout.localToCell(point);

                expect(rangeContains(range, cell)).toBe(true);
                reached.minColumn = Math.min(reached.minColumn, cell.column);
                reached.minRow = Math.min(reached.minRow, cell.row);
                reached.maxColumn = Math.max(reached.maxColumn, cell.column);
                reached.maxRow = Math.max(reached.maxRow, cell.row);
              }
            }

            expect(reached).toEqual(range);

            // Every cell whose footprint overlaps the rect is in the range.
            const rectangle = rectPolygon(rect);

            for (const cell of cellsIn(-14, 14)) {
              if (
                convexPolygonsOverlap(
                  layout.getCellPolygon(cell.column, cell.row),
                  rectangle,
                )
              ) {
                expect(rangeContains(range, cell)).toBe(true);
              }
            }
          }
        });

        it('draws overlapping images back to front in row-major order, within and across chunks', () => {
          const cells = cellsIn(-3, 2);

          const imageOf = (cell: GridCell): Rect => {
            const bounds = layout.getCellFootprintBounds(cell.column, cell.row);

            // One cell wide and two cells tall, on the bottom-left of the
            // footprint bounds.
            return {
              min: {
                x: bounds.min.x,
                y: bounds.max.y - 2 * layout.cellHeight,
              },
              max: { x: bounds.min.x + layout.cellWidth, y: bounds.max.y },
            };
          };

          const chunkSizes = [2, 3];
          const pairsAcrossChunks = chunkSizes.map(() => 0);
          let overlappingPairs = 0;

          for (const a of cells) {
            for (const b of cells) {
              if (compareDrawOrder(a, b) >= 0) {
                continue;
              }

              const imageA = imageOf(a);
              const imageB = imageOf(b);
              const overlapWidth =
                Math.min(imageA.max.x, imageB.max.x) -
                Math.max(imageA.min.x, imageB.min.x);
              const overlapHeight =
                Math.min(imageA.max.y, imageB.max.y) -
                Math.max(imageA.min.y, imageB.min.y);

              if (overlapWidth <= 1e-9 || overlapHeight <= 1e-9) {
                continue;
              }

              overlappingPairs++;

              // `a` comes before `b`, so `b` must be in front: lower on
              // the screen.
              expect(imageB.max.y).toBeGreaterThan(imageA.max.y);

              chunkSizes.forEach((chunkSize, index) => {
                expect(compareDrawOrder(a, b, chunkSize)).toBeLessThan(0);

                const sameChunk =
                  Math.floor(a.column / chunkSize) ===
                    Math.floor(b.column / chunkSize) &&
                  Math.floor(a.row / chunkSize) ===
                    Math.floor(b.row / chunkSize);

                if (!sameChunk) {
                  pairsAcrossChunks[index]++;
                }
              });
            }
          }

          expect(overlappingPairs).toBeGreaterThan(0);

          for (const count of pairsAcrossChunks) {
            expect(count).toBeGreaterThan(0);
          }
        });

        it('returns 0, never -0, around the origin', () => {
          const center = layout.getCellCenter(-0.5, -0.5);
          const cell = layout.localToCell({ x: -0, y: -0 });
          const cellSpacePoint = layout.localToCellSpace({ x: -0, y: -0 });
          const range = layout.getCellRangeForLocalRect({
            min: { x: -0, y: -0 },
            max: { x: 0, y: 0 },
          });
          const values = [
            center.x,
            center.y,
            cell.column,
            cell.row,
            cellSpacePoint.x,
            cellSpacePoint.y,
            range.minColumn,
            range.minRow,
            range.maxColumn,
            range.maxRow,
            ...[
              ...layout.getCellPolygon(0, 0),
              ...layout.getCellPolygon(-1, -1),
            ].flatMap((corner) => [corner.x, corner.y]),
          ];

          for (const value of values) {
            expect(Object.is(value, -0)).toBe(false);
          }
        });

        it('throws for a non-finite point', () => {
          expect(() => layout.localToCell({ x: NaN, y: 0 })).toThrow(
            /isn't finite/,
          );
          expect(() => layout.localToCell({ x: 0, y: Infinity })).toThrow(
            /isn't finite/,
          );
        });

        it('throws for a non-finite or inverted rect', () => {
          expect(() =>
            layout.getCellRangeForLocalRect({
              min: { x: -Infinity, y: 0 },
              max: { x: 0, y: 0 },
            }),
          ).toThrow(/isn't finite/);
          expect(() =>
            layout.getCellRangeForLocalRect({
              min: { x: 0, y: 0 },
              max: { x: 0, y: NaN },
            }),
          ).toThrow(/isn't finite/);
          expect(() =>
            layout.getCellRangeForLocalRect({
              min: { x: 1, y: 0 },
              max: { x: 0, y: 0 },
            }),
          ).toThrow(/min is greater than its max/);
          expect(() =>
            layout.getCellRangeForLocalRect({
              min: { x: 0, y: 1 },
              max: { x: 0, y: 0 },
            }),
          ).toThrow(/min is greater than its max/);
        });
      });
    }

    describe('validation', () => {
      for (const value of [0, -1, NaN, Infinity]) {
        it(`throws for a cellWidth or cellHeight of ${value}`, () => {
          expect(() =>
            createLayout({ cellWidth: value, cellHeight: 1 }),
          ).toThrow(
            `${name}: cellWidth must be a positive finite number, received ${value}.`,
          );
          expect(() =>
            createLayout({ cellWidth: 1, cellHeight: value }),
          ).toThrow(
            `${name}: cellHeight must be a positive finite number, received ${value}.`,
          );
        });
      }
    });
  });
}
