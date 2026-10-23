import { describe, expect, it } from 'vitest';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { GridLayout } from '../../math/grid-layout/grid-layout.js';
import { Random } from '../../math/random.js';
import { findPath } from '../find-path.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { shortestCosts, TestEdge } from '../test-helpers/test-graph.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { NavigationGrid, NavigationGridDiagonals } from './navigation-grid.js';

const squareLayout = createOrthogonalGridLayout({
  cellWidth: 32,
  cellHeight: 32,
});

const layouts: readonly [name: string, layout: GridLayout][] = [
  ['square', squareLayout],
  [
    'rectangular',
    createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 }),
  ],
  ['isometric', createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 })],
];

const diagonalRules: readonly NavigationGridDiagonals[] = [
  'never',
  'always',
  'noCornerCutting',
];

const createSquareGrid = (
  diagonals: NavigationGridDiagonals = 'noCornerCutting',
  columns = 3,
  rows = 3,
): NavigationGrid =>
  createNavigationGrid({
    cells: cellRange(columns, rows),
    layout: squareLayout,
    diagonals,
  });

/** Every step out of a node, as `[neighbor, cost]`. */
const getSteps = (
  grid: NavigationGrid,
  node: number,
): [neighbor: number, cost: number][] => {
  const steps: [number, number][] = [];

  grid.forEachNeighbor(node, (neighbor, cost) => {
    steps.push([neighbor, cost]);
  });

  return steps;
};

const getNeighbors = (grid: NavigationGrid, node: number): number[] =>
  getSteps(grid, node)
    .map(([neighbor]) => neighbor)
    .sort((a, b) => a - b);

/** Every step of a grid, for Bellman-Ford. */
const getEdges = (grid: NavigationGrid): TestEdge[] => {
  const edges: TestEdge[] = [];

  for (let node = 0; node < grid.nodeCount; node++) {
    for (const [neighbor, cost] of getSteps(grid, node)) {
      edges.push([node, neighbor, cost]);
    }
  }

  return edges;
};

/** A grid with seeded random blocked cells and costs. */
const createRandomGrid = (
  random: Random,
  layout: GridLayout,
  diagonals: NavigationGridDiagonals,
  cells = cellRange(6, 5),
): NavigationGrid => {
  const grid = createNavigationGrid({ cells, layout, diagonals });

  for (let row = cells.minRow; row <= cells.maxRow; row++) {
    for (let column = cells.minColumn; column <= cells.maxColumn; column++) {
      grid.setWalkable(column, row, random.randomInt(0, 4) !== 0);
      grid.setCost(column, row, random.randomInt(1, 8) / 2);
    }
  }

  return grid;
};

// A block of cells around (0, 0), from (-3, -2) to (2, 1).
const negativeCells = cellRange(6, 4, -3, -2);

// Costs are 32-bit floats and diagonal lengths involve square roots, so a
// heuristic and a summed path cost can differ in their last bits.
const tolerance = 1e-9;

describe('createNavigationGrid', () => {
  it('starts with every cell walkable, costing 1, at version 0', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 3),
      layout: squareLayout,
    });

    expect(grid.nodeCount).toBe(12);
    expect(grid.columns).toBe(4);
    expect(grid.rows).toBe(3);
    expect(grid.version).toBe(0);
    expect(grid.origin).toEqual({ x: 0, y: 0 });
    expect(grid.diagonals).toBe('noCornerCutting');

    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 4; column++) {
        expect(grid.isWalkable(column, row)).toBe(true);
        expect(grid.getCost(column, row)).toBe(1);
      }
    }
  });

  it('copies the origin it is given and the one it returns', () => {
    const origin = { x: 5, y: 6 };
    const grid = createNavigationGrid({
      cells: cellRange(1, 1),
      layout: squareLayout,
      origin,
    });

    origin.x = 100;
    grid.origin.y = 100;

    expect(grid.origin).toEqual({ x: 5, y: 6 });
  });

  it('copies the cells it is given and the ones it returns', () => {
    const cells = cellRange(3, 2, -4, 7);
    const grid = createNavigationGrid({ cells, layout: squareLayout });

    cells.minColumn = 0;
    grid.cells.maxRow = 100;

    expect(grid.cells).toEqual({
      minColumn: -4,
      minRow: 7,
      maxColumn: -2,
      maxRow: 8,
    });
    expect(grid.columns).toBe(3);
    expect(grid.rows).toBe(2);
    expect(grid.nodeCount).toBe(6);
  });

  it('has a single cell when min and max are equal', () => {
    const grid = createNavigationGrid({
      cells: { minColumn: -5, minRow: 3, maxColumn: -5, maxRow: 3 },
      layout: squareLayout,
    });

    expect(grid.nodeCount).toBe(1);
    expect(grid.nodeToCell(0)).toEqual({ column: -5, row: 3 });
  });

  it.each([1.5, NaN, Infinity, 2 ** 53])(
    'throws for a bound of %s',
    (bound) => {
      const bounds = ['minColumn', 'minRow', 'maxColumn', 'maxRow'] as const;

      for (const name of bounds) {
        expect(() =>
          createNavigationGrid({
            cells: { ...cellRange(2, 2), [name]: bound },
            layout: squareLayout,
          }),
        ).toThrow('the bounds of cells must be safe integers');
      }
    },
  );

  it('throws for a min greater than its max', () => {
    expect(() =>
      createNavigationGrid({
        cells: { minColumn: 1, minRow: 0, maxColumn: 0, maxRow: 0 },
        layout: squareLayout,
      }),
    ).toThrow('the min of cells must not be greater than its max');
    expect(() =>
      createNavigationGrid({
        cells: { minColumn: 0, minRow: -2, maxColumn: 0, maxRow: -3 },
        layout: squareLayout,
      }),
    ).toThrow('the min of cells must not be greater than its max');
  });

  it('throws for more than 2^31 - 1 cells', () => {
    expect(() =>
      createNavigationGrid({
        cells: cellRange(65536, 32768, -30000, -16000),
        layout: squareLayout,
      }),
    ).toThrow('more than the most a grid can have');
  });

  it('throws for an origin that is not finite', () => {
    expect(() =>
      createNavigationGrid({
        cells: cellRange(2, 2),
        layout: squareLayout,
        origin: { x: NaN, y: 0 },
      }),
    ).toThrow('origin must be finite');
  });

  it('throws for an unknown diagonal rule', () => {
    expect(() =>
      createNavigationGrid({
        cells: cellRange(2, 2),
        layout: squareLayout,
        // @ts-expect-error - checks a value from untyped code.
        diagonals: 'sometimes',
      }),
    ).toThrow("diagonals must be 'never', 'always' or 'noCornerCutting'");
  });
});

describe('NavigationGrid cells', () => {
  it('reads back walkability and cost, and keeps the cost of a blocked cell', () => {
    const grid = createSquareGrid();

    grid.setCost(1, 2, 3.5);
    grid.setWalkable(1, 2, false);

    expect(grid.isWalkable(1, 2)).toBe(false);
    expect(grid.getCost(1, 2)).toBe(3.5);

    grid.setWalkable(1, 2, true);

    expect(grid.isWalkable(1, 2)).toBe(true);
    expect(grid.getCost(1, 2)).toBe(3.5);
  });

  it('stores costs as 32-bit floats', () => {
    const grid = createSquareGrid();

    grid.setCost(0, 0, 0.1);

    expect(grid.getCost(0, 0)).toBe(Math.fround(0.1));
  });

  it.each([0, -1, NaN, Infinity, 1e-50, 1e40])(
    'throws for a cost of %s',
    (cost) => {
      const grid = createSquareGrid();

      expect(() => grid.setCost(0, 0, cost)).toThrow(
        'it must be finite and more than 0 as a 32-bit float',
      );
      expect(() =>
        grid.fillCost(
          { minColumn: 0, minRow: 0, maxColumn: 1, maxRow: 1 },
          cost,
        ),
      ).toThrow('it must be finite and more than 0 as a 32-bit float');
    },
  );

  it.each([
    [-1, 0],
    [3, 0],
    [0, -1],
    [0, 3],
    [0.5, 0],
    [NaN, 0],
  ])('throws for cell (%s, %s), which is not in the grid', (column, row) => {
    const grid = createSquareGrid();

    expect(grid.hasCell(column, row)).toBe(false);
    expect(() => grid.isWalkable(column, row)).toThrow(
      "it isn't in the grid, which has integer columns from 0 to 2 and rows from 0 to 2",
    );
    expect(() => grid.getCost(column, row)).toThrow("it isn't in the grid");
    expect(() => grid.setWalkable(column, row, false)).toThrow(
      "it isn't in the grid",
    );
    expect(() => grid.setCost(column, row, 2)).toThrow("it isn't in the grid");
    expect(() => grid.cellToNode(column, row)).toThrow("it isn't in the grid");
    expect(() => grid.cellToWorld(column, row)).toThrow("it isn't in the grid");
  });

  it.each([-1, 9, 1.5])('throws for node %s in nodeToCell', (node) => {
    expect(() => createSquareGrid().nodeToCell(node)).toThrow(
      'it must be an integer from 0 to 8',
    );
  });

  it('throws for cells just outside a grid of negative cells', () => {
    const grid = createNavigationGrid({
      cells: negativeCells,
      layout: squareLayout,
    });

    expect(grid.hasCell(-3, -2)).toBe(true);
    expect(grid.hasCell(2, 1)).toBe(true);

    for (const [column, row] of [
      [-4, -2],
      [3, 1],
      [-3, -3],
      [2, 2],
    ]) {
      expect(grid.hasCell(column, row)).toBe(false);
      expect(() => grid.isWalkable(column, row)).toThrow(
        "it isn't in the grid, which has integer columns from -3 to 2 and rows from -2 to 1",
      );
    }
  });

  it('fills an inclusive range, clipped to a grid of negative cells', () => {
    const grid = createNavigationGrid({
      cells: negativeCells,
      layout: squareLayout,
    });

    grid.fillWalkable(
      { minColumn: -10, minRow: 0, maxColumn: -2, maxRow: 10 },
      false,
    );
    grid.fillCost({ minColumn: 2, minRow: -9, maxColumn: 9, maxRow: -2 }, 4);

    for (let row = -2; row <= 1; row++) {
      for (let column = -3; column <= 2; column++) {
        expect(grid.isWalkable(column, row)).toBe(!(column <= -2 && row >= 0));
        expect(grid.getCost(column, row)).toBe(
          column === 2 && row === -2 ? 4 : 1,
        );
      }
    }
  });

  it('fills an inclusive range, clipped to the grid', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 4),
      layout: squareLayout,
    });

    grid.fillWalkable(
      { minColumn: -2, minRow: 2, maxColumn: 1, maxRow: 10 },
      false,
    );
    grid.fillCost({ minColumn: 3, minRow: -5, maxColumn: 8, maxRow: 0 }, 4);

    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        expect(grid.isWalkable(column, row)).toBe(!(column <= 1 && row >= 2));
        expect(grid.getCost(column, row)).toBe(
          column === 3 && row === 0 ? 4 : 1,
        );
      }
    }
  });

  it('changes nothing for a range entirely outside the grid', () => {
    const grid = createSquareGrid();

    grid.fillWalkable(
      { minColumn: 5, minRow: 0, maxColumn: 6, maxRow: 2 },
      false,
    );

    expect(grid.version).toBe(0);
  });

  it('throws for a range with non-integer bounds or min over max', () => {
    const grid = createSquareGrid();

    expect(() =>
      grid.fillWalkable(
        { minColumn: 0.5, minRow: 0, maxColumn: 1, maxRow: 1 },
        false,
      ),
    ).toThrow("the range's bounds must be integers");
    expect(() =>
      grid.fillCost({ minColumn: 2, minRow: 0, maxColumn: 1, maxRow: 1 }, 2),
    ).toThrow('its min is greater than its max');
  });
});

describe('NavigationGrid.fillWalkableMask', () => {
  it('blocks and opens exactly the masked cells', () => {
    const grid = createSquareGrid();
    const mask = new Uint8Array([1, 0, 0, 0, 2, 0, 0, 0, 1]);

    grid.fillWalkableMask(mask, false);

    for (let node = 0; node < grid.nodeCount; node++) {
      const { column, row } = grid.nodeToCell(node);

      expect(grid.isWalkable(column, row)).toBe(mask[node] === 0);
    }

    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 2, maxRow: 0 },
      false,
    );
    grid.fillWalkableMask(new Uint8Array([0, 1, 0, 0, 1, 0, 0, 0, 0]), true);

    expect(grid.isWalkable(0, 0)).toBe(false);
    expect(grid.isWalkable(1, 0)).toBe(true);
    expect(grid.isWalkable(2, 0)).toBe(false);
    expect(grid.isWalkable(1, 1)).toBe(true);
    expect(grid.isWalkable(2, 2)).toBe(false);
  });

  it('increases version once for a mask that changes many cells', () => {
    const grid = createSquareGrid();

    grid.fillWalkableMask(new Uint8Array(9).fill(1), false);

    expect(grid.version).toBe(1);
  });

  it('leaves version alone for a mask that changes nothing', () => {
    const grid = createSquareGrid();

    grid.setWalkable(1, 1, false);
    grid.fillWalkableMask(new Uint8Array(9), false);
    grid.fillWalkableMask(new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 0]), false);
    grid.fillWalkableMask(new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0]), true);

    expect(grid.version).toBe(1);
  });

  it.each([0, 8, 10])('throws for a mask of %s bytes', (length) => {
    expect(() =>
      createSquareGrid().fillWalkableMask(new Uint8Array(length), false),
    ).toThrow('it must have one byte per cell, 9');
  });
});

describe('NavigationGrid version', () => {
  it('increases once per call that changes a cell', () => {
    const grid = createSquareGrid();

    grid.setWalkable(0, 0, false);
    expect(grid.version).toBe(1);

    grid.setCost(1, 1, 2);
    expect(grid.version).toBe(2);

    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 2, maxRow: 2 },
      false,
    );
    expect(grid.version).toBe(3);

    grid.fillCost({ minColumn: 0, minRow: 0, maxColumn: 2, maxRow: 2 }, 5);
    expect(grid.version).toBe(4);
  });

  it('stays the same for a call that changes nothing', () => {
    const grid = createSquareGrid();

    grid.setWalkable(0, 0, true);
    grid.setCost(0, 0, 1);
    grid.fillCost({ minColumn: 0, minRow: 0, maxColumn: 2, maxRow: 2 }, 1);
    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 2, maxRow: 2 },
      true,
    );

    expect(grid.version).toBe(0);
  });
});

describe('NavigationGrid conversions', () => {
  const origins = [
    { x: 0, y: 0 },
    { x: -100.5, y: 37 },
    { x: 250, y: -480 },
  ];

  const cellBlocks = [cellRange(5, 4), negativeCells];

  describe.each(layouts)('on a %s layout', (_, layout) => {
    describe.each(cellBlocks)('with cells %o', (cells) => {
      it.each(origins)(
        'round-trips every cell through the world with origin %o',
        (origin) => {
          const grid = createNavigationGrid({ cells, layout, origin });

          for (let row = cells.minRow; row <= cells.maxRow; row++) {
            for (
              let column = cells.minColumn;
              column <= cells.maxColumn;
              column++
            ) {
              expect(grid.worldToCell(grid.cellToWorld(column, row))).toEqual({
                column,
                row,
              });
              expect(grid.nodeToCell(grid.cellToNode(column, row))).toEqual({
                column,
                row,
              });
            }
          }
        },
      );

      it('returns null for positions just outside the grid', () => {
        const origin = { x: -100.5, y: 37 };
        const grid = createNavigationGrid({ cells, layout, origin });
        const middleColumn = (cells.minColumn + cells.maxColumn + 1) / 2;
        const middleRow = (cells.minRow + cells.maxRow + 1) / 2;
        const outside = [
          { x: cells.minColumn - 0.25, y: middleRow },
          { x: cells.maxColumn + 1.25, y: middleRow },
          { x: middleColumn, y: cells.minRow - 0.25 },
          { x: middleColumn, y: cells.maxRow + 1.25 },
        ];

        for (const cellSpace of outside) {
          const local = layout.cellSpaceToLocal(cellSpace);

          expect(
            grid.worldToCell({ x: local.x + origin.x, y: local.y + origin.y }),
          ).toBeNull();
        }
      });
    });

    it('places the cells a grid of negative cells shares with one from (0, 0) the same', () => {
      const origin = { x: -100.5, y: 37 };
      const fromZero = createNavigationGrid({
        cells: cellRange(3, 2),
        layout,
        origin,
      });
      const negative = createNavigationGrid({
        cells: negativeCells,
        layout,
        origin,
      });

      for (let row = 0; row <= 1; row++) {
        for (let column = 0; column <= 2; column++) {
          expect(negative.cellToWorld(column, row)).toEqual(
            fromZero.cellToWorld(column, row),
          );
        }
      }
    });
  });

  it('numbers nodes row by row', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 3),
      layout: squareLayout,
    });

    expect(grid.cellToNode(3, 0)).toBe(3);
    expect(grid.cellToNode(0, 1)).toBe(4);
    expect(grid.nodeToCell(11)).toEqual({ column: 3, row: 2 });
  });

  it('numbers nodes row by row from the first cell', () => {
    const grid = createNavigationGrid({
      cells: negativeCells,
      layout: squareLayout,
    });

    expect(grid.cellToNode(-3, -2)).toBe(0);
    expect(grid.cellToNode(2, -2)).toBe(5);
    expect(grid.cellToNode(-3, -1)).toBe(6);
    expect(grid.cellToNode(0, 0)).toBe(15);
    expect(grid.nodeToCell(grid.nodeCount - 1)).toEqual({ column: 2, row: 1 });
  });

  it('puts cell (0, 0) at the origin, with rows increasing down the screen', () => {
    const grid = createNavigationGrid({
      cells: cellRange(4, 4),
      layout: squareLayout,
      origin: { x: -64, y: -64 },
    });

    expect(grid.worldToCell({ x: -64, y: -64 })).toEqual({
      column: 0,
      row: 0,
    });
    expect(grid.worldToCell({ x: -32.001, y: -32.001 })).toEqual({
      column: 0,
      row: 0,
    });
    // A shared edge belongs to the cell that owns it: the one below.
    expect(grid.worldToCell({ x: -64, y: -32 })).toEqual({ column: 0, row: 1 });
    expect(grid.cellToWorld(0, 1)).toEqual({ x: -48, y: -16 });
    expect(grid.worldToCell({ x: -64.001, y: -64 })).toBeNull();
    expect(grid.worldToCell({ x: 64, y: 0 })).toBeNull();
  });

  it('throws for a position that is not finite', () => {
    expect(() => createSquareGrid().worldToCell({ x: NaN, y: 0 })).toThrow(
      "the position isn't finite",
    );
  });
});

describe('NavigationGrid steps', () => {
  // A 3 x 3 grid with its centre-top cell (1, 0) blocked:
  //  0 [1] 2
  //  3  4  5
  //  6  7  8
  const createCornerGrid = (diagonals: NavigationGridDiagonals) => {
    const grid = createSquareGrid(diagonals);

    grid.setWalkable(1, 0, false);

    return grid;
  };

  it("takes only orthogonal steps with 'never'", () => {
    const grid = createSquareGrid('never');

    expect(getNeighbors(grid, 4)).toEqual([1, 3, 5, 7]);
  });

  it("steps diagonally past a blocked cell's corner with 'always'", () => {
    const grid = createCornerGrid('always');

    expect(getNeighbors(grid, 3)).toEqual([0, 4, 6, 7]);
    expect(getNeighbors(grid, 4)).toEqual([0, 2, 3, 5, 6, 7, 8]);
  });

  it("doesn't cut a blocked cell's corner with 'noCornerCutting'", () => {
    const grid = createCornerGrid('noCornerCutting');

    // 3 -> 0 passes between 0 and 4, both walkable.
    expect(getNeighbors(grid, 3)).toEqual([0, 4, 6, 7]);
    // 4 -> 0 and 4 -> 2 pass by the blocked cell 1.
    expect(getNeighbors(grid, 4)).toEqual([3, 5, 6, 7, 8]);
  });

  it('only reports neighbors in the grid at its edges and corners', () => {
    const grid = createSquareGrid('always');

    expect(getNeighbors(grid, 0)).toEqual([1, 3, 4]);
    expect(getNeighbors(grid, 5)).toEqual([1, 2, 4, 7, 8]);
    expect(getNeighbors(grid, 8)).toEqual([4, 5, 7]);
  });

  it('steps out of a blocked cell, but never into one', () => {
    const grid = createSquareGrid('always');

    // Node 4 is the centre cell.
    grid.setWalkable(1, 1, false);

    expect(getNeighbors(grid, 4)).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
    expect(getNeighbors(grid, 0)).toEqual([1, 3]);
  });

  it("costs the entered cell's cost times the distance between centres", () => {
    const grid = createSquareGrid('always');

    grid.setCost(2, 1, 3);
    grid.setCost(2, 2, 2);

    const steps = new Map(getSteps(grid, 4));

    expect(steps.get(5)).toBe(96);
    expect(steps.get(8)).toBeCloseTo(64 * Math.SQRT2);
    expect(steps.get(1)).toBe(32);
  });

  it('uses the layout to measure steps', () => {
    const grid = createNavigationGrid({
      cells: cellRange(3, 3),
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      diagonals: 'always',
    });
    const steps = new Map(getSteps(grid, 4));

    expect(steps.get(5)).toBeCloseTo(Math.hypot(32, 16));
    // (1, 1) runs straight down the screen and (1, -1) straight across.
    expect(steps.get(8)).toBe(32);
    expect(steps.get(2)).toBe(64);
  });
});

describe('NavigationGrid heuristic', () => {
  describe.each(layouts)('on a %s layout', (_, layout) => {
    it.each(diagonalRules)(
      "equals the cheapest cost on an empty grid with '%s'",
      (diagonals) => {
        const grid = createNavigationGrid({
          cells: cellRange(5, 4),
          layout,
          diagonals,
        });
        const edges = getEdges(grid);

        for (let goal = 0; goal < grid.nodeCount; goal++) {
          const costs = shortestCosts(grid.nodeCount, edges, goal);

          for (let node = 0; node < grid.nodeCount; node++) {
            expect(grid.heuristic(node, goal)).toBeCloseTo(costs[node], 9);
          }
        }
      },
    );

    it.each(diagonalRules)(
      "is consistent and gives the cheapest paths on random grids with '%s'",
      (diagonals) => {
        const random = new Random(`grid-${diagonals}`);

        for (let trial = 0; trial < 6; trial++) {
          // Every other grid has negative cells, which the search must
          // see through node ids alone.
          const grid = createRandomGrid(
            random,
            layout,
            diagonals,
            trial % 2 === 0 ? cellRange(6, 5) : cellRange(6, 5, -3, -2),
          );
          const edges = getEdges(grid);
          const goal = random.randomInt(0, grid.nodeCount - 1);

          for (const [from, to, cost] of edges) {
            expect(grid.heuristic(from, goal)).toBeLessThanOrEqual(
              cost + grid.heuristic(to, goal) + tolerance,
            );
          }

          // Steps are symmetric apart from the entered cell's cost, so
          // search towards the goal and compare against costs out of it
          // on the reversed graph.
          const reversed: TestEdge[] = edges.map(([from, to, cost]) => [
            to,
            from,
            cost,
          ]);
          const costs = shortestCosts(grid.nodeCount, reversed, goal);

          for (let start = 0; start < grid.nodeCount; start++) {
            const result = findPath(grid, start, goal);

            if (costs[start] === Infinity) {
              expect(result.status).toBe('unreachable');

              continue;
            }

            expect(result.status).toBe('found');
            expect(result.cost).toBeCloseTo(costs[start], 9);
          }
        }
      },
    );

    it('expands only the cells on the path across an open grid', () => {
      const grid = createNavigationGrid({ cells: cellRange(8, 6), layout });
      const result = findPath(
        grid,
        grid.cellToNode(0, 0),
        grid.cellToNode(7, 4),
      );

      expect(result.status).toBe('found');
      expect(result.expanded).toBe(result.nodes.length - 1);
    });
  });

  it('scales by the lowest cell cost', () => {
    const grid = createSquareGrid('never', 4, 1);

    expect(grid.heuristic(0, 3)).toBe(96);

    grid.setCost(2, 0, 0.5);
    expect(grid.heuristic(0, 3)).toBe(48);

    // Raising a cell that wasn't the cheapest changes nothing.
    grid.setCost(1, 0, 4);
    expect(grid.heuristic(0, 3)).toBe(48);

    // Raising the only cheapest cell rescans for the next lowest.
    grid.setCost(2, 0, 2);
    expect(grid.heuristic(0, 3)).toBe(96);

    grid.fillCost({ minColumn: 0, minRow: 0, maxColumn: 3, maxRow: 0 }, 3);
    expect(grid.heuristic(0, 3)).toBe(288);
  });
});
