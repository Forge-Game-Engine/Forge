import { describe, expect, it } from 'vitest';
import { addPositionComponent } from '../../common/components/position-component.js';
import { addRotationComponent } from '../../common/components/rotation-component.js';
import { addScaleComponent } from '../../common/components/scale-component.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createIsometricGridLayout } from '../../math/grid-layout/create-isometric-grid-layout.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { GridLayout } from '../../math/grid-layout/grid-layout.js';
import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { createBroadPhase } from '../../physics/broad-phase/create-broad-phase.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { CircleCollider } from '../../physics/colliders/circle-collider.js';
import { Collider } from '../../physics/colliders/collider.js';
import { PolygonCollider } from '../../physics/colliders/polygon-collider.js';
import { TerrainCollider } from '../../physics/colliders/terrain-collider.js';
import { addColliderComponent } from '../../physics/components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyType,
} from '../../physics/components/rigidbody-component.js';
import { containsPointChain } from '../../physics/queries/contains-point-chain.js';
import { overlapPoint } from '../../physics/queries/overlap-point.js';
import { createBroadPhaseEcsSystem } from '../../physics/systems/broad-phase-system.js';
import { Aabb } from '../../physics/types/aabb.js';
import { buildTilemapCollisionLoops } from '../../tilemaps/collision/build-tilemap-collision-loops.js';
import {
  clearTile,
  fillTiles,
  setTile,
} from '../../tilemaps/cells/edit-tiles.js';
import { addTilemapLayerComponent } from '../../tilemaps/components/tilemap-layer-component.js';
import {
  collisionTestTile,
  createCollisionTestTileSet,
  fullTileIndex,
  slopeTileIndex,
} from '../../tilemaps/test-helpers/create-collision-test-tile-set.js';
import {
  compareWithReference,
  distanceToShape,
  getBlockedCells,
  getRangeCells,
  ReferenceShape,
} from '../test-helpers/bake-reference.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationGrid } from './create-navigation-grid.js';
import { findGridPath } from './find-grid-path.js';
import { markGridFromColliders } from './mark-grid-from-colliders.js';
import { NavigationGrid } from './navigation-grid.js';

const squareLayout = createOrthogonalGridLayout({
  cellWidth: 16,
  cellHeight: 16,
});

const createSquareGrid = (columns = 12, rows = 12): NavigationGrid =>
  createNavigationGrid({
    cells: cellRange(columns, rows),
    layout: squareLayout,
  });

interface BodyOptions {
  position?: Vector2;
  rotation?: number;
  sensor?: boolean;
  category?: number;
  bodyType?: RigidBodyType;
}

const addBody = (
  world: EcsWorld,
  collider: Collider,
  { position, rotation, sensor, category, bodyType }: BodyOptions = {},
): number => {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });

  if (rotation !== undefined) {
    addRotationComponent(world, entity, { local: rotation });
  }

  addColliderComponent(world, entity, { collider, sensor, category });

  if (bodyType !== undefined) {
    addRigidBodyComponent(world, entity, { type: bodyType });
  }

  return entity;
};

const createBox = (width: number, height: number): PolygonCollider =>
  new PolygonCollider([
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ]);

/** Turns `+X` towards `+Y` by `angle` radians, then moves by `position`. */
const place = (
  points: readonly Vector2[],
  position: Vector2,
  angle: number,
): Vector2[] =>
  points.map((point) => ({
    x: position.x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: position.y + point.x * Math.sin(angle) + point.y * Math.cos(angle),
  }));

const boxPoints = (width: number, height: number): Vector2[] => [
  { x: -width / 2, y: -height / 2 },
  { x: width / 2, y: -height / 2 },
  { x: width / 2, y: height / 2 },
  { x: -width / 2, y: height / 2 },
];

/** A square loop over cells `min` to `max` of a 16-pixel grid, both axes. */
const cellSquare = (min: number, max: number, isHole = false): Vector2[] => {
  const low = min * 16;
  const high = (max + 1) * 16;
  const loop = [
    { x: low, y: low },
    { x: high, y: low },
    { x: high, y: high },
    { x: low, y: high },
  ];

  return isHole ? loop.reverse() : loop;
};

const bake = (
  collider: Collider,
  options: BodyOptions = {},
  agentRadius?: number,
  grid: NavigationGrid = createSquareGrid(),
): NavigationGrid => {
  const world = new EcsWorld();

  addBody(world, collider, options);
  markGridFromColliders(world, grid, { agentRadius });

  return grid;
};

const expectMatchesReference = (
  grid: NavigationGrid,
  shapes: readonly ReferenceShape[],
  agentRadius: number,
): void => {
  const { wrong, undecided, blocked } = compareWithReference(
    grid,
    shapes,
    agentRadius,
  );

  expect(wrong).toEqual([]);
  expect(blocked).toBeGreaterThan(0);
  expect(undecided).toBeLessThan(grid.nodeCount / 4);
};

describe('markGridFromColliders circles', () => {
  it('blocks only the cell a small circle sits in', () => {
    const grid = bake(new CircleCollider(4), { position: { x: 88, y: 88 } });

    expect(getBlockedCells(grid)).toEqual(['5,5']);
  });

  it('blocks the four cells around a corner it sits on', () => {
    const grid = bake(new CircleCollider(4), { position: { x: 80, y: 80 } });

    expect(getBlockedCells(grid)).toEqual(getRangeCells(4, 4, 5, 5));
  });

  it('turns an off-centre circle with its entity', () => {
    const grid = bake(new CircleCollider(6, 1, { x: 32, y: 0 }), {
      position: { x: 88, y: 88 },
      rotation: Math.PI / 2,
    });

    expect(getBlockedCells(grid)).toEqual(['5,7']);
  });

  it('blocks every cell a large circle overlaps', () => {
    const grid = bake(new CircleCollider(30), { position: { x: 100, y: 90 } });

    expectMatchesReference(
      grid,
      [{ kind: 'disc', center: { x: 100, y: 90 }, radius: 30 }],
      0,
    );
  });
});

describe('markGridFromColliders polygons', () => {
  it('blocks only its own cells for a box on cell boundaries', () => {
    const grid = bake(createBox(32, 48), { position: { x: 48, y: 72 } });

    expect(getBlockedCells(grid)).toEqual(getRangeCells(2, 3, 3, 5));
  });

  it('blocks one more row and column for the box moved by half a cell', () => {
    const grid = bake(createBox(32, 48), { position: { x: 56, y: 80 } });

    expect(getBlockedCells(grid)).toEqual(getRangeCells(2, 3, 4, 6));
  });

  it('blocks every cell a rotated box overlaps', () => {
    const position = { x: 90, y: 94 };
    const grid = bake(createBox(60, 24), {
      position,
      rotation: Math.PI / 6,
    });

    expectMatchesReference(
      grid,
      [
        {
          kind: 'loops',
          loops: [place(boxPoints(60, 24), position, Math.PI / 6)],
        },
      ],
      0,
    );
  });

  it('blocks every cell a thin wall crosses, though it misses their centres', () => {
    const grid = bake(createBox(4, 64), { position: { x: 84, y: 64 } });

    expect(getBlockedCells(grid)).toEqual(getRangeCells(5, 2, 5, 5));
  });

  it('blocks every cell a triangle overlaps', () => {
    const triangle = [
      { x: 20, y: 30 },
      { x: 150, y: 70 },
      { x: 60, y: 170 },
    ];
    const grid = bake(new PolygonCollider(triangle));

    expectMatchesReference(grid, [{ kind: 'loops', loops: [triangle] }], 0);
  });

  it("places vertices that aren't around the entity's origin", () => {
    const vertices = [
      { x: 40, y: 10 },
      { x: 90, y: 20 },
      { x: 70, y: 50 },
    ];
    const position = { x: 30, y: 60 };
    const grid = bake(new PolygonCollider(vertices), {
      position,
      rotation: 0.5,
    });

    expectMatchesReference(
      grid,
      [{ kind: 'loops', loops: [place(vertices, position, 0.5)] }],
      0,
    );
  });
});

describe('markGridFromColliders terrain', () => {
  const surface = [
    { x: 16, y: 96 },
    { x: 80, y: 64 },
    { x: 144, y: 96 },
  ];
  const silhouette = [...surface, { x: 144, y: 112 }, { x: 16, y: 112 }];

  it('blocks its whole slab, bounded by its sides and bottom', () => {
    const grid = bake(new TerrainCollider(surface, 16));

    expectMatchesReference(grid, [{ kind: 'loops', loops: [silhouette] }], 0);
    expect(grid.isWalkable(5, 5)).toBe(false);
    expect(grid.isWalkable(0, 6)).toBe(true);
    expect(grid.isWalkable(9, 6)).toBe(true);
    expect(grid.isWalkable(5, 7)).toBe(true);
  });

  it('blocks a rotated slab', () => {
    const position = { x: 20, y: -10 };
    const grid = bake(new TerrainCollider(surface, 16), {
      position,
      rotation: 0.3,
    });

    expectMatchesReference(
      grid,
      [{ kind: 'loops', loops: [place(silhouette, position, 0.3)] }],
      0,
    );
  });
});

describe('markGridFromColliders chains', () => {
  it('blocks the walls of a room and leaves the room open', () => {
    const grid = bake(
      new ChainCollider([cellSquare(1, 10), cellSquare(3, 8, true)]),
    );

    expect(getBlockedCells(grid)).toEqual(
      getRangeCells(1, 1, 10, 10).filter(
        (cell) => !getRangeCells(3, 3, 8, 8).includes(cell),
      ),
    );
  });

  it('blocks an island inside the room', () => {
    const grid = bake(
      new ChainCollider([
        cellSquare(1, 10),
        cellSquare(3, 8, true),
        cellSquare(5, 6),
      ]),
    );
    const room = getRangeCells(3, 3, 8, 8);
    const island = getRangeCells(5, 5, 6, 6);

    expect(getBlockedCells(grid)).toEqual(
      getRangeCells(1, 1, 10, 10).filter(
        (cell) => !room.includes(cell) || island.includes(cell),
      ),
    );
  });

  it('blocks every cell outside a lone hole, including rows it never reaches', () => {
    const grid = bake(new ChainCollider([cellSquare(3, 8, true)]));
    const room = getRangeCells(3, 3, 8, 8);

    expect(getBlockedCells(grid)).toEqual(
      getRangeCells(0, 0, 11, 11).filter((cell) => !room.includes(cell)),
    );
  });

  it('blocks every cell a diagonal slope crosses', () => {
    const loop = [
      { x: 0, y: 180 },
      { x: 180, y: 20 },
      { x: 180, y: 180 },
    ];
    const grid = bake(new ChainCollider([loop]));

    expectMatchesReference(grid, [{ kind: 'loops', loops: [loop] }], 0);
  });

  it('changes nothing for a chain with no loops', () => {
    const grid = bake(new ChainCollider([]));

    expect(getBlockedCells(grid)).toEqual([]);
    expect(grid.version).toBe(0);
  });

  it('lets the largest loop decide what a contradictory chain leaves outside', () => {
    const islandLarger = bake(
      new ChainCollider([cellSquare(0, 5), cellSquare(8, 10, true)]),
    );
    const holeLarger = bake(
      new ChainCollider([cellSquare(0, 1), cellSquare(4, 10, true)]),
    );
    const hole = getRangeCells(4, 4, 10, 10);

    expect(getBlockedCells(islandLarger)).toEqual(getRangeCells(0, 0, 5, 5));
    expect(getBlockedCells(holeLarger)).toEqual(
      getRangeCells(0, 0, 11, 11).filter((cell) => !hole.includes(cell)),
    );
  });
});

describe('markGridFromColliders and point queries on chains', () => {
  /** Bakes a chain into a grid larger than it, with a broad phase that has run. */
  const bakeWithBroadPhase = (
    collider: ChainCollider,
  ): { world: EcsWorld; grid: NavigationGrid; entity: number } => {
    const world = new EcsWorld();

    createBroadPhase(world);
    world.addSystem(createBroadPhaseEcsSystem([]));

    const entity = addBody(world, collider);
    const grid = createSquareGrid();

    world.update();
    markGridFromColliders(world, grid);

    return { world, grid, entity };
  };

  const isInsideBounds = (point: Vector2, bounds: Aabb): boolean =>
    point.x >= bounds.min.x &&
    point.x <= bounds.max.x &&
    point.y >= bounds.min.y &&
    point.y <= bounds.max.y;

  it.each([
    ['a solid loop with a hole', [cellSquare(1, 8), cellSquare(3, 6, true)]],
    ['a lone hole', [cellSquare(3, 8, true)]],
  ])(
    'agree on which cell centres of %s are solid',
    (_name, loops: Vector2[][]) => {
      const collider = new ChainCollider(loops);
      const { world, grid, entity } = bakeWithBroadPhase(collider);
      const body = { position: { x: 0, y: 0 }, rotation: 0, collider };
      const bounds = collider.computeAabb({ x: 0, y: 0 }, 0);
      let insideBoundsCount = 0;

      for (let row = 0; row < 12; row++) {
        for (let column = 0; column < 12; column++) {
          const centre = grid.cellToWorld(column, row);
          const isBlocked = !grid.isWalkable(column, row);

          expect(containsPointChain(body, centre)).toBe(isBlocked);

          if (isInsideBounds(centre, bounds)) {
            insideBoundsCount++;
            expect(overlapPoint(world, centre).includes(entity)).toBe(
              isBlocked,
            );
          }
        }
      }

      expect(insideBoundsCount).toBeGreaterThan(0);
    },
  );

  it('leaves overlapPoint blind to a lone hole’s solid beyond its bounds', () => {
    const collider = new ChainCollider([cellSquare(3, 8, true)]);
    const { world, grid, entity } = bakeWithBroadPhase(collider);
    const body = { position: { x: 0, y: 0 }, rotation: 0, collider };
    // Cell (0, 0) is outside the room's bounds (cells 3 to 8).
    const centre = grid.cellToWorld(0, 0);

    expect(grid.isWalkable(0, 0)).toBe(false);
    expect(containsPointChain(body, centre)).toBe(true);
    expect(overlapPoint(world, centre)).not.toContain(entity);
  });
});

describe('markGridFromColliders agentRadius', () => {
  const box = (): PolygonCollider => createBox(48, 48);
  const boxPosition = { x: 88, y: 88 };

  it('pads a box on cell boundaries by one ring for a radius of one cell', () => {
    const grid = bake(box(), { position: boxPosition }, 16);

    expect(getBlockedCells(grid)).toEqual(getRangeCells(3, 3, 7, 7));
  });

  it('rounds the corners of the padding', () => {
    const grid = bake(box(), { position: boxPosition }, 20);
    const corners = ['2,2', '8,2', '2,8', '8,8'];

    expect(getBlockedCells(grid)).toEqual(
      getRangeCells(2, 2, 8, 8).filter((cell) => !corners.includes(cell)),
    );
  });

  it('blocks the neighbors a radius below one cell reaches', () => {
    const grid = bake(box(), { position: boxPosition }, 4);

    expect(getBlockedCells(grid)).toEqual(getRangeCells(3, 3, 7, 7));
  });

  it("adds a circle's radius and the agent radius", () => {
    const grid = bake(new CircleCollider(4), { position: { x: 88, y: 88 } }, 6);

    expect(getBlockedCells(grid)).toEqual(['5,4', '4,5', '5,5', '6,5', '5,6']);
  });

  it('pads a thin wall by how far each side of it reaches', () => {
    const grid = bake(createBox(4, 64), { position: { x: 84, y: 64 } }, 8);

    expect(getBlockedCells(grid)).toEqual(getRangeCells(4, 1, 5, 6));
  });

  it.each([3, 10, 23])(
    'matches the reference for a rotated box and a radius of %s',
    (agentRadius) => {
      const position = { x: 95, y: 88 };
      const grid = bake(
        createBox(40, 12),
        { position, rotation: -0.7 },
        agentRadius,
      );

      expectMatchesReference(
        grid,
        [{ kind: 'loops', loops: [place(boxPoints(40, 12), position, -0.7)] }],
        agentRadius,
      );
    },
  );

  it.each([-1, Number.NaN, Infinity])(
    'throws for an agentRadius of %s',
    (agentRadius) => {
      expect(() =>
        markGridFromColliders(new EcsWorld(), createSquareGrid(), {
          agentRadius,
        }),
      ).toThrow('agentRadius must be a finite number of 0 or more');
    },
  );
});

describe('markGridFromColliders which colliders count', () => {
  const bakeBox = (options: BodyOptions, mask?: number): NavigationGrid => {
    const world = new EcsWorld();
    const grid = createSquareGrid();

    addBody(world, createBox(16, 16), {
      position: { x: 88, y: 88 },
      ...options,
    });
    markGridFromColliders(world, grid, { mask });

    return grid;
  };

  it('skips sensors', () => {
    const grid = bakeBox({ sensor: true });

    expect(getBlockedCells(grid)).toEqual([]);
    expect(grid.version).toBe(0);
  });

  it.each<RigidBodyType>(['dynamic', 'kinematic'])(
    'skips %s bodies',
    (bodyType) => {
      expect(getBlockedCells(bakeBox({ bodyType }))).toEqual([]);
    },
  );

  it('bakes static bodies and colliders with no rigid body', () => {
    expect(getBlockedCells(bakeBox({ bodyType: 'static' }))).toEqual(['5,5']);
    expect(getBlockedCells(bakeBox({}))).toEqual(['5,5']);
  });

  it("skips colliders whose category isn't in the mask", () => {
    expect(getBlockedCells(bakeBox({ category: 2 }, 1))).toEqual([]);
    expect(getBlockedCells(bakeBox({ category: 2 }, 6))).toEqual(['5,5']);
  });

  it('bakes every category by default', () => {
    expect(getBlockedCells(bakeBox({ category: 1 << 31 }))).toEqual(['5,5']);
  });

  it('uses the world transform the transform system composed, not the local one', () => {
    const world = new EcsWorld();
    const grid = createSquareGrid();
    const parent = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 64, y: 64 } });
    addRotationComponent(world, parent, { local: Math.PI / 2 });

    const child = addBody(world, createBox(8, 8), {
      position: { x: 32, y: 0 },
      rotation: 0,
    });

    world.setParent(child, parent);
    world.addSystem(createTransformEcsSystem(new Time()));
    world.update();
    markGridFromColliders(world, grid);

    expect(getBlockedCells(grid)).toEqual(['3,5', '4,5', '3,6', '4,6']);
  });

  it('ignores scale, as physics does', () => {
    const world = new EcsWorld();
    const grid = createSquareGrid();
    const entity = addBody(world, createBox(16, 16), {
      position: { x: 88, y: 88 },
    });

    addScaleComponent(world, entity, { local: { x: 2, y: 2 } });
    markGridFromColliders(world, grid);

    expect(getBlockedCells(grid)).toEqual(['5,5']);
  });

  it('changes nothing for a collider wholly outside the grid', () => {
    const grid = bake(new ChainCollider([cellSquare(20, 30)]), {}, 8);

    expect(getBlockedCells(grid)).toEqual([]);
    expect(grid.version).toBe(0);
  });
});

describe('markGridFromColliders grid behavior', () => {
  it('never makes a cell walkable', () => {
    const grid = createSquareGrid();

    grid.setWalkable(0, 0, false);
    grid.setWalkable(11, 11, false);
    bake(createBox(16, 16), { position: { x: 88, y: 88 } }, 0, grid);

    expect(getBlockedCells(grid)).toEqual(['0,0', '5,5', '11,11']);
  });

  it('increases version once per bake that blocks a cell', () => {
    const world = new EcsWorld();
    const grid = createSquareGrid();

    addBody(world, createBox(64, 64), { position: { x: 88, y: 88 } });
    markGridFromColliders(world, grid);

    expect(grid.version).toBe(1);

    markGridFromColliders(world, grid);

    expect(grid.version).toBe(1);
  });

  it('re-bakes a moved collider after the grid is opened', () => {
    const world = new EcsWorld();
    const grid = createSquareGrid();
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 88, y: 88 },
    });

    addColliderComponent(world, entity, { collider: createBox(16, 16) });
    world.addSystem(createTransformEcsSystem(new Time()));
    world.update();
    markGridFromColliders(world, grid);

    position.local = { x: 24, y: 40 };
    world.update();
    grid.fillWalkable(
      { minColumn: 0, minRow: 0, maxColumn: 11, maxRow: 11 },
      true,
    );
    markGridFromColliders(world, grid);

    expect(getBlockedCells(grid)).toEqual(['1,2']);
  });
});

describe('markGridFromColliders layouts', () => {
  const layouts: readonly [
    name: string,
    layout: GridLayout,
    origin: Vector2,
  ][] = [
    [
      'rectangular',
      createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 16 }),
      { x: -40, y: 24 },
    ],
    [
      'isometric',
      createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      { x: 200, y: -40 },
    ],
  ];

  // A 12 x 12 block from (0, 0), and one from (-4, -5).
  const cellBlocks = [cellRange(12, 12), cellRange(12, 12, -4, -5)];

  const createLayoutGrid = (
    layout: GridLayout,
    origin: Vector2,
    cells = cellBlocks[0],
  ): NavigationGrid => createNavigationGrid({ cells, layout, origin });

  /**
   * A world point at a cell-space position of the grid, counted from its
   * first cell, so each shape covers the same part of every block.
   */
  const at = (grid: NavigationGrid, x: number, y: number): Vector2 => {
    const local = grid.layout.cellSpaceToLocal({
      x: grid.cells.minColumn + x,
      y: grid.cells.minRow + y,
    });

    return { x: local.x + grid.origin.x, y: local.y + grid.origin.y };
  };

  const cases: readonly [
    name: string,
    build: (grid: NavigationGrid) => [Collider, BodyOptions, ReferenceShape],
  ][] = [
    [
      'a circle',
      (grid) => {
        const center = at(grid, 5.3, 6.1);

        return [
          new CircleCollider(37),
          { position: center },
          { kind: 'disc', center, radius: 37 },
        ];
      },
    ],
    [
      'a rotated box',
      (grid) => {
        const position = at(grid, 6, 5.5);

        return [
          createBox(90, 30),
          { position, rotation: 0.4 },
          {
            kind: 'loops',
            loops: [place(boxPoints(90, 30), position, 0.4)],
          },
        ];
      },
    ],
    [
      'a thin rotated wall',
      (grid) => {
        const position = at(grid, 6.2, 6.7);

        return [
          createBox(3, 140),
          { position, rotation: 1.1 },
          {
            kind: 'loops',
            loops: [place(boxPoints(3, 140), position, 1.1)],
          },
        ];
      },
    ],
    [
      'a terrain',
      (grid) => {
        const position = at(grid, 2, 3);
        const surface = [
          { x: 0, y: 40 },
          { x: 70, y: 10 },
          { x: 160, y: 60 },
        ];

        return [
          new TerrainCollider(surface, 30),
          { position },
          {
            kind: 'loops',
            loops: [
              place(
                [...surface, { x: 160, y: 90 }, { x: 0, y: 90 }],
                position,
                0,
              ),
            ],
          },
        ];
      },
    ],
    [
      'a chain room',
      (grid) => {
        const position = at(grid, 6, 6);
        const loops = [
          boxPoints(200, 160),
          boxPoints(120, 90).reverse(),
          boxPoints(30, 30),
        ];

        return [
          new ChainCollider(loops),
          { position, rotation: 0.2 },
          {
            kind: 'loops',
            loops: loops.map((loop) => place(loop, position, 0.2)),
          },
        ];
      },
    ],
  ];

  for (const [layoutName, layout, origin] of layouts) {
    for (const cells of cellBlocks) {
      const block = `cells from (${cells.minColumn}, ${cells.minRow})`;

      for (const [shapeName, build] of cases) {
        it.each([0, 9])(
          `blocks the cells ${shapeName} overlaps on a ${layoutName} grid of ${block}, with an agent radius of %s`,
          (agentRadius) => {
            const grid = createLayoutGrid(layout, origin, cells);
            const [collider, options, shape] = build(grid);

            bake(collider, options, agentRadius, grid);

            expectMatchesReference(grid, [shape], agentRadius);
          },
        );
      }
    }
  }

  it.each(layouts)(
    "blocks exactly a tile layer's solid cells on a %s grid",
    (_name, layout, origin) => {
      const world = new EcsWorld();
      const layerEntity = world.createEntity();
      const layer = addTilemapLayerComponent(world, layerEntity, {
        tileSet: createCollisionTestTileSet(layout),
      });

      fillTiles(layer, 2, 1, 4, 3, collisionTestTile(fullTileIndex));
      clearTile(layer, 3, 2);
      setTile(layer, 7, 5, collisionTestTile(fullTileIndex));
      setTile(layer, 8, 6, collisionTestTile(fullTileIndex));
      setTile(layer, 6, 1, collisionTestTile(slopeTileIndex));

      const grid = createLayoutGrid(layout, origin);

      addBody(world, new ChainCollider(buildTilemapCollisionLoops(layer)), {
        position: origin,
      });
      markGridFromColliders(world, grid);

      expect(getBlockedCells(grid)).toEqual([
        '2,1',
        '3,1',
        '4,1',
        '5,1',
        '6,1',
        '2,2',
        '4,2',
        '5,2',
        '2,3',
        '3,3',
        '4,3',
        '5,3',
        '7,5',
        '8,6',
      ]);
    },
  );
});

describe('markGridFromColliders paths', () => {
  /** Adds random circles and rotated boxes, returning their world shapes. */
  const addRandomLevel = (
    world: EcsWorld,
    random: Random,
  ): ReferenceShape[] => {
    const shapes: ReferenceShape[] = [];

    for (let i = 0; i < 8; i++) {
      const position = {
        x: random.randomFloat(0, 384),
        y: random.randomFloat(0, 384),
      };

      if (random.randomInt(0, 1) === 0) {
        const radius = random.randomFloat(4, 30);

        addBody(world, new CircleCollider(radius), { position });
        shapes.push({ kind: 'disc', center: position, radius });

        continue;
      }

      const width = random.randomFloat(4, 80);
      const height = random.randomFloat(4, 80);
      const rotation = random.randomFloat(0, Math.PI);

      addBody(world, createBox(width, height), { position, rotation });
      shapes.push({
        kind: 'loops',
        loops: [place(boxPoints(width, height), position, rotation)],
      });
    }

    return shapes;
  };

  const getWalkableNodes = (grid: NavigationGrid): number[] => {
    const walkable: number[] = [];

    for (let node = 0; node < grid.nodeCount; node++) {
      const { column, row } = grid.nodeToCell(node);

      if (grid.isWalkable(column, row)) {
        walkable.push(node);
      }
    }

    return walkable;
  };

  /** The least distance from a sampled path to any shape. */
  const getPathClearance = (
    points: readonly Vector2[],
    shapes: readonly ReferenceShape[],
  ): number => {
    let clearance = Infinity;

    for (let i = 1; i < points.length; i++) {
      for (let step = 0; step <= 16; step++) {
        const t = step / 16;
        const point = {
          x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
          y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
        };

        for (const shape of shapes) {
          clearance = Math.min(clearance, distanceToShape(point, shape));
        }
      }
    }

    return clearance;
  };

  it('keeps every grid path clear of the colliders by the agent radius', () => {
    const random = new Random('bake paths');
    // Wider than a cell, so a bake that padded too little would leave
    // walkable cells whose centres, and the steps between them, are too
    // close to a collider.
    const agentRadius = 24;

    for (let level = 0; level < 5; level++) {
      const world = new EcsWorld();
      const grid = createSquareGrid(24, 24);
      const shapes = addRandomLevel(world, random);

      markGridFromColliders(world, grid, { agentRadius });

      const walkable = getWalkableNodes(grid);

      for (let pair = 0; pair < 20; pair++) {
        const from = grid.nodeToCell(
          walkable[random.randomInt(0, walkable.length - 1)],
        );
        const to = grid.nodeToCell(
          walkable[random.randomInt(0, walkable.length - 1)],
        );
        const { points } = findGridPath(
          grid,
          grid.cellToWorld(from.column, from.row),
          grid.cellToWorld(to.column, to.row),
        );

        expect(getPathClearance(points, shapes)).toBeGreaterThan(
          agentRadius - 1e-3,
        );
      }
    }
  });
});
