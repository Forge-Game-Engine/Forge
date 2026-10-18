import {
  addPositionComponent,
  addSpriteComponent,
  Color,
  createAtlasSprite,
  createCamera,
  createCanvas,
  createGridTextureAtlas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTransformEcsSystem,
  EcsWorld,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 600 world units, so
// one world unit is one CSS pixel.
const verticalWorldUnits = 600;

// The sheet: 3 columns by 2 rows of 8 x 8 texel cells, 1 texel of margin
// and 2 texels of spacing, the gutters a color no cell uses.
const cellSize = 8;
const columns = 3;
const rows = 2;
const margin = 1;
const spacing = 2;
const sheetWidth = margin * 2 + columns * cellSize + (columns - 1) * spacing;
const sheetHeight = margin * 2 + rows * cellSize + (rows - 1) * spacing;
const gutterFill = '#ff00ff';
const cellFills = [
  '#ff3030',
  '#30c030',
  '#3060ff',
  '#ffd020',
  '#20d0d0',
  '#ff8000',
];
// Each cell's top-left quarter, so a cell drawn flipped or shifted by part
// of a cell doesn't match.
const cellAccentFill = '#ffffff';

// Every texel is drawn as an 8 x 8 block of CSS pixels, so texel edges land
// on pixel edges and nearest filtering samples each texel's center.
const pixelsPerUnit = 1 / 8;
const texelSizeInWorldUnits = 1 / pixelsPerUnit;

// The whole sheet, drawn as a reference above the cells.
const referenceCenter = { x: 0, y: -150 };

// The six cell sprites in a row below it, consecutive in draw order.
const cellRowY = 100;
const cellSpacingInWorldUnits = 80;

/** What one cell sprite drew, compared with the reference sheet. */
export interface CellComparison {
  /**
   * The fraction (`0` to `1`) of the cell sprite's pixels that differ from
   * the reference sheet's pixels over the same cell.
   */
  mismatchWithOwnCell: number;
  /**
   * The same fraction against the next cell's pixels in the reference
   * sheet, showing the comparison can tell cells apart.
   */
  mismatchWithNextCell: number;
}

/**
 * The scene's handle: a grid atlas's texture drawn whole as a reference,
 * and each of its cells drawn with `createAtlasSprite`.
 */
export interface GridTextureAtlasSceneHandle extends SceneHandle {
  /** The number of cells, and of cell sprites. */
  readonly cellCount: number;
  /**
   * The instance count of every `drawArraysInstanced` call made during the
   * last `step()` - one entry per instanced draw call.
   */
  readonly lastFrameInstancedDraws: readonly number[];
  /**
   * Compares each cell sprite's pixels with the reference sheet's. Must
   * run in the same `page.evaluate` task as the `step()` before it.
   */
  compareCells(): CellComparison[];
}

/**
 * Draws the sheet: magenta gutters around six cells, each a color of its
 * own with a white top-left quarter.
 * @returns The canvas to upload.
 */
function drawSheet(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = sheetWidth;
  source.height = sheetHeight;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.fillStyle = gutterFill;
  context.fillRect(0, 0, sheetWidth, sheetHeight);

  for (const [index, fill] of cellFills.entries()) {
    const x = margin + (index % columns) * (cellSize + spacing);
    const y = margin + Math.floor(index / columns) * (cellSize + spacing);

    context.fillStyle = fill;
    context.fillRect(x, y, cellSize, cellSize);
    context.fillStyle = cellAccentFill;
    context.fillRect(x, y, cellSize / 2, cellSize / 2);
  }

  return source;
}

/** Whether two RGBA pixels differ by more than antialiasing noise. */
function pixelsDiffer(
  data: Uint8ClampedArray,
  first: number,
  second: number,
): boolean {
  for (let channel = 0; channel < 3; channel++) {
    if (Math.abs(data[first + channel] - data[second + channel]) > 24) {
      return true;
    }
  }

  return false;
}

/**
 * Builds a scene with one texture laid out as a 3 x 2 grid with a margin and
 * spacing, cut by `createGridTextureAtlas`. The texture is drawn whole with
 * `createImageSprite` as a reference, and each cell is drawn with
 * `createAtlasSprite` at the same texels-per-pixel scale, so each cell
 * sprite's pixels should match the reference's pixels over that cell, with
 * none of the gutter or a neighbor at its edges. Wraps the context's
 * `drawArraysInstanced` to count a frame's instanced draw calls.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): GridTextureAtlasSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const { gl } = renderContext;

  let instancedDraws: number[] = [];
  let lastFrameInstancedDraws: readonly number[] = [];
  const drawArraysInstanced = gl.drawArraysInstanced.bind(gl);

  gl.drawArraysInstanced = (
    mode: GLenum,
    first: GLint,
    count: GLsizei,
    instanceCount: GLsizei,
  ): void => {
    instancedDraws.push(instanceCount);
    drawArraysInstanced(mode, first, count, instanceCount);
  };

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.05, 0.1, 0.3),
    verticalWorldUnits,
  });

  const texture = createTexture(renderContext, drawSheet(), {
    filter: 'nearest',
  });
  const atlas = createGridTextureAtlas(texture, {
    cellWidth: cellSize,
    cellHeight: cellSize,
    spacing,
    margin,
  });

  const referenceEntity = world.createEntity();

  addPositionComponent(world, referenceEntity, { local: referenceCenter });
  addSpriteComponent(
    world,
    referenceEntity,
    createImageSprite(texture, { pixelsPerUnit }),
  );

  const firstCellX =
    (-(atlas.regions.length - 1) * cellSpacingInWorldUnits) / 2;
  const cellCenters = atlas.regions.map((_, index) => ({
    x: firstCellX + index * cellSpacingInWorldUnits,
    y: cellRowY,
  }));

  for (const [index, center] of cellCenters.entries()) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: center });
    addSpriteComponent(
      world,
      entity,
      createAtlasSprite(atlas, index, { pixelsPerUnit }),
    );
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      instancedDraws = [];
      world.update();
      lastFrameInstancedDraws = instancedDraws;
    },

    cellCount: atlas.regions.length,

    get lastFrameInstancedDraws(): readonly number[] {
      return lastFrameInstancedDraws;
    },

    compareCells(): CellComparison[] {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { data } = context2d.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const devicePixelsPerUnit = renderContext.height / verticalWorldUnits;
      const toPixel = (worldX: number, worldY: number): [number, number] => [
        Math.round(canvas.width / 2 + worldX * devicePixelsPerUnit),
        Math.round(canvas.height / 2 + worldY * devicePixelsPerUnit),
      ];
      const offsetOf = (x: number, y: number): number =>
        (y * canvas.width + x) * 4;

      const [referenceLeft, referenceTop] = toPixel(
        referenceCenter.x - (sheetWidth * texelSizeInWorldUnits) / 2,
        referenceCenter.y - (sheetHeight * texelSizeInWorldUnits) / 2,
      );
      const cellSizeInPixels = Math.round(
        cellSize * texelSizeInWorldUnits * devicePixelsPerUnit,
      );

      // The top-left pixel of cell `index` inside the reference sheet.
      const referenceCellOrigin = (index: number): [number, number] => {
        const texelX = margin + (index % columns) * (cellSize + spacing);
        const texelY =
          margin + Math.floor(index / columns) * (cellSize + spacing);
        const texelInPixels = texelSizeInWorldUnits * devicePixelsPerUnit;

        return [
          referenceLeft + Math.round(texelX * texelInPixels),
          referenceTop + Math.round(texelY * texelInPixels),
        ];
      };

      const mismatchFraction = (
        [cellLeft, cellTop]: [number, number],
        [otherLeft, otherTop]: [number, number],
      ): number => {
        let mismatches = 0;

        for (let v = 0; v < cellSizeInPixels; v++) {
          for (let u = 0; u < cellSizeInPixels; u++) {
            const differs = pixelsDiffer(
              data,
              offsetOf(cellLeft + u, cellTop + v),
              offsetOf(otherLeft + u, otherTop + v),
            );

            mismatches += differs ? 1 : 0;
          }
        }

        return mismatches / (cellSizeInPixels * cellSizeInPixels);
      };

      return cellCenters.map((center, index) => {
        const cellOrigin = toPixel(
          center.x - (cellSize * texelSizeInWorldUnits) / 2,
          center.y - (cellSize * texelSizeInWorldUnits) / 2,
        );

        return {
          mismatchWithOwnCell: mismatchFraction(
            cellOrigin,
            referenceCellOrigin(index),
          ),
          mismatchWithNextCell: mismatchFraction(
            cellOrigin,
            referenceCellOrigin((index + 1) % cellCenters.length),
          ),
        };
      });
    },
  };
};
