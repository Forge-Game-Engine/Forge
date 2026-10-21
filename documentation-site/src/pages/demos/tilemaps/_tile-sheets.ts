import { Random } from '@forge-game-engine/forge/math';
import {
  createTexture,
  RenderContext,
  Texture,
} from '@forge-game-engine/forge/rendering';

/** The size of one orthogonal tile, in texels and in the map's local units. */
export const orthogonalTileSize = 40;

/** The orthogonal sheet's tiles, by their index in the sheet (left to right). */
export const orthogonalTiles = {
  grass: 0,
  path: 1,
  water: 2,
  sand: 3,
  canopy: 4,
  arch: 5,
} as const;

/** The size of an isometric cell's diamond, in the map's local units. */
export const isometricCell = { width: 80, height: 40 };

/**
 * The size of one isometric tile image, in texels and local units: a cell
 * wide and three cells tall, so a wall can rise two cells above its floor.
 */
export const isometricTileSize = { width: 80, height: 120 };

/** The isometric sheet's tiles, by their index in the sheet. */
export const isometricTiles = {
  stone: 0,
  grass: 1,
  hedge: 2,
  wall: 3,
} as const;

/** How tall the isometric hedge and wall rise above their floor, in local units. */
export const isometricHeights = { hedge: 30, wall: 80 };

const createCanvas = (
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  return { canvas, context };
};

/** Scatters small squares over a tile, seeded so the sheet is the same every run. */
const speckle = (
  context: CanvasRenderingContext2D,
  random: Random,
  left: number,
  colors: readonly string[],
  count: number,
): void => {
  for (let i = 0; i < count; i++) {
    context.fillStyle = colors[i % colors.length];
    context.fillRect(
      left + Math.floor(random.randomFloat(1, orthogonalTileSize - 3)),
      Math.floor(random.randomFloat(1, orthogonalTileSize - 3)),
      2,
      2,
    );
  }
};

const drawGroundTile = (
  context: CanvasRenderingContext2D,
  random: Random,
  index: number,
  base: string,
  details: readonly string[],
): void => {
  const left = index * orthogonalTileSize;

  context.fillStyle = base;
  context.fillRect(left, 0, orthogonalTileSize, orthogonalTileSize);
  speckle(context, random, left, details, 18);
};

const drawWater = (context: CanvasRenderingContext2D, index: number): void => {
  const left = index * orthogonalTileSize;

  context.fillStyle = '#3a78c9';
  context.fillRect(left, 0, orthogonalTileSize, orthogonalTileSize);
  context.strokeStyle = '#7fb2ec';
  context.lineWidth = 2;

  for (const [x, y] of [
    [6, 10],
    [20, 24],
    [4, 32],
  ]) {
    context.beginPath();
    context.moveTo(left + x, y);
    context.quadraticCurveTo(left + x + 5, y - 4, left + x + 10, y);
    context.quadraticCurveTo(left + x + 15, y + 4, left + x + 20, y);
    context.stroke();
  }
};

/** A round clump of leaves with see-through corners, drawn over the ground. */
const drawCanopy = (context: CanvasRenderingContext2D, index: number): void => {
  const centerX = index * orthogonalTileSize + orthogonalTileSize / 2;
  const centerY = orthogonalTileSize / 2;

  context.fillStyle = '#1f4d1d';
  context.beginPath();
  context.arc(centerX, centerY, orthogonalTileSize * 0.48, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#2f7a2b';

  for (const [x, y, radius] of [
    [-7, -6, 9],
    [7, -5, 8],
    [-4, 7, 8],
    [8, 7, 7],
  ]) {
    context.beginPath();
    context.arc(centerX + x, centerY + y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = '#4fa045';
  context.beginPath();
  context.arc(centerX - 8, centerY - 8, 4, 0, Math.PI * 2);
  context.fill();
};

/** Two stone pillars and a lintel, open in the middle so what's under it shows. */
const drawArch = (context: CanvasRenderingContext2D, index: number): void => {
  const left = index * orthogonalTileSize;
  const pillarWidth = 7;
  const lintelHeight = 11;

  context.fillStyle = '#5d636e';
  context.fillRect(left, 0, pillarWidth, orthogonalTileSize);
  context.fillRect(
    left + orthogonalTileSize - pillarWidth,
    0,
    pillarWidth,
    orthogonalTileSize,
  );
  context.fillRect(left, 0, orthogonalTileSize, lintelHeight);

  context.fillStyle = '#9aa1ad';
  context.fillRect(left + 1, 1, pillarWidth - 3, orthogonalTileSize - 2);
  context.fillRect(
    left + orthogonalTileSize - pillarWidth + 2,
    1,
    pillarWidth - 3,
    orthogonalTileSize - 2,
  );
  context.fillRect(left + 1, 1, orthogonalTileSize - 2, lintelHeight - 4);
};

/**
 * Draws the orthogonal map's tile sheet, one row of 40 x 40 texel tiles in
 * the order of {@link orthogonalTiles}: four ground tiles that fill their
 * cell, and two cover tiles with see-through parts that draw over the
 * ground.
 * @param renderContext - The render context to create the texture in.
 * @returns The sheet's texture.
 */
export function createOrthogonalSheet(renderContext: RenderContext): Texture {
  const tileCount = Object.keys(orthogonalTiles).length;
  const { canvas, context } = createCanvas(
    tileCount * orthogonalTileSize,
    orthogonalTileSize,
  );
  const random = new Random('tilemaps');

  drawGroundTile(context, random, orthogonalTiles.grass, '#4f8f35', [
    '#3d7428',
    '#6bb04a',
  ]);
  drawGroundTile(context, random, orthogonalTiles.path, '#a77f4d', [
    '#8a6539',
    '#c49a63',
  ]);
  drawWater(context, orthogonalTiles.water);
  drawGroundTile(context, random, orthogonalTiles.sand, '#dcc785', [
    '#c4ad6a',
    '#efdea4',
  ]);
  drawCanopy(context, orthogonalTiles.canopy);
  drawArch(context, orthogonalTiles.arch);

  return createTexture(renderContext, canvas);
}

/**
 * Draws an isometric block standing on the diamond at the bottom of tile
 * `index`: its top face `height` above the floor, and its left and right
 * faces when it has `sides`. A height of `0` without sides draws a flat
 * floor diamond.
 */
const drawBlock = (
  context: CanvasRenderingContext2D,
  index: number,
  height: number,
  colors: {
    top: string;
    edge: string;
    sides?: { left: string; right: string };
  },
): void => {
  const left = index * isometricTileSize.width;
  const right = left + isometricTileSize.width;
  const middle = left + isometricTileSize.width / 2;
  const bottom = isometricTileSize.height;
  const halfCell = isometricCell.height / 2;

  const polygon = (points: readonly [number, number][], fill: string): void => {
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);

    for (const [x, y] of points.slice(1)) {
      context.lineTo(x, y);
    }

    context.closePath();
    context.fill();
    context.strokeStyle = colors.edge;
    context.lineWidth = 1;
    context.stroke();
  };

  if (colors.sides) {
    polygon(
      [
        [left, bottom - halfCell - height],
        [middle, bottom - height],
        [middle, bottom],
        [left, bottom - halfCell],
      ],
      colors.sides.left,
    );
    polygon(
      [
        [middle, bottom - height],
        [right, bottom - halfCell - height],
        [right, bottom - halfCell],
        [middle, bottom],
      ],
      colors.sides.right,
    );
  }

  polygon(
    [
      [middle, bottom - isometricCell.height - height],
      [right, bottom - halfCell - height],
      [middle, bottom - height],
      [left, bottom - halfCell - height],
    ],
    colors.top,
  );
};

/**
 * Draws the isometric map's tile sheet, one row of 80 x 120 texel tiles in
 * the order of {@link isometricTiles}. Every tile stands on the 80 x 40
 * diamond at the bottom of its image, the way the tile set places it in its
 * cell: the floors are flat, and the hedge and the wall rise above their
 * cell, over the cells behind them.
 * @param renderContext - The render context to create the texture in.
 * @returns The sheet's texture.
 */
export function createIsometricSheet(renderContext: RenderContext): Texture {
  const tileCount = Object.keys(isometricTiles).length;
  const { canvas, context } = createCanvas(
    tileCount * isometricTileSize.width,
    isometricTileSize.height,
  );

  drawBlock(context, isometricTiles.stone, 0, {
    top: '#8d939c',
    edge: '#6f7580',
  });
  drawBlock(context, isometricTiles.grass, 0, {
    top: '#4f8f35',
    edge: '#3d7428',
  });
  drawBlock(context, isometricTiles.hedge, isometricHeights.hedge, {
    top: '#4fa045',
    edge: '#173a16',
    sides: { left: '#2f7a2b', right: '#1f4d1d' },
  });
  drawBlock(context, isometricTiles.wall, isometricHeights.wall, {
    top: '#c9b79a',
    edge: '#4f4334',
    sides: { left: '#a38f70', right: '#76654d' },
  });

  return createTexture(renderContext, canvas);
}

/**
 * Draws the outline the editor puts on the cell under the mouse: a square
 * for the orthogonal map, or a diamond for the isometric one.
 * @param renderContext - The render context to create the texture in.
 * @param shape - The cell's shape.
 * @param width - The cell's width, in texels.
 * @param height - The cell's height, in texels.
 * @returns The outline's texture.
 */
export function createCellOutline(
  renderContext: RenderContext,
  shape: 'square' | 'diamond',
  width: number,
  height: number,
): Texture {
  const { canvas, context } = createCanvas(width, height);
  const inset = 2;

  context.beginPath();

  if (shape === 'square') {
    context.rect(inset, inset, width - inset * 2, height - inset * 2);
  } else {
    context.moveTo(width / 2, inset);
    context.lineTo(width - inset * 2, height / 2);
    context.lineTo(width / 2, height - inset);
    context.lineTo(inset * 2, height / 2);
    context.closePath();
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.18)';
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.stroke();

  return createTexture(renderContext, canvas);
}

/**
 * Draws the character: a round red explorer with a white outline, looking
 * down the screen.
 * @param renderContext - The render context to create the texture in.
 * @returns The character's texture.
 */
export function createCharacterTexture(renderContext: RenderContext): Texture {
  const size = 30;
  const { canvas, context } = createCanvas(size, size);

  context.fillStyle = '#d8423a';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = '#ffffff';

  for (const x of [10, 20]) {
    context.beginPath();
    context.arc(x, 17, 3, 0, Math.PI * 2);
    context.fill();
  }

  return createTexture(renderContext, canvas);
}
