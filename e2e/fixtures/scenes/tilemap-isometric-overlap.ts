import {
  addCameraComponent,
  addPositionComponent,
  addTilemapLayerComponent,
  clearTile,
  Color,
  createCanvas,
  createGridTextureAtlas,
  createIsometricGridLayout,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTilemapRenderEcsSystem,
  createTileSet,
  createTransformEcsSystem,
  EcsWorld,
  getCameraView,
  packTile,
  setTile,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 300 world units of height on the 800 x 600 canvas: 2 device pixels per
// world unit.
const verticalWorldUnits = 300;

// 2:1 diamonds, 64 by 32 world units. Every tile is two cells tall (64 by
// 64), like an isometric wall, so it reaches up from its cell's footprint
// over the cells behind it.
const cellWidth = 64;
const cellHeight = 32;
const tileHeight = 2 * cellHeight;

// The atlas: one row of solid 8 x 8 texel cells.
const atlasCellSize = 8;

/** The colors of the scene's tiles. */
export type IsometricTileColor = 'red' | 'blue' | 'green';

const tileColors: readonly IsometricTileColor[] = ['red', 'blue', 'green'];
const atlasFills: Record<IsometricTileColor, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#00ff00',
};

/** What a sampled pixel shows, by its color. */
export type IsometricPixel = IsometricTileColor | 'background';

/**
 * The cells the scene paints, all in one vertical line through `x = 0`:
 * cell `(c, r)`'s diamond has its top corner at
 * `((c - r) * cellWidth / 2, (c + r) * cellHeight / 2)`.
 *
 * - `back` is `(0, 0)`, in row `0`: its image covers y in [-32, 32].
 * - `front` is `(1, 1)`, in row `1`: its image covers y in [0, 64], so its
 *   top half covers the bottom half of `back`'s.
 * - `behind` is `(-1, -1)`, in row `-1` and a chunk of its own, up and to
 *   the left of the others': its image covers y in [-64, 0], so `back`
 *   covers its bottom half.
 */
export type IsometricCellName = 'back' | 'front' | 'behind';

const cells: Record<IsometricCellName, { column: number; row: number }> = {
  back: { column: 0, row: 0 },
  front: { column: 1, row: 1 },
  behind: { column: -1, row: -1 },
};

/** What `tilemap-isometric-overlap.spec.ts` asserts against, from one frame. */
export interface IsometricOverlapMeasurement {
  /**
   * What each pixel shows down the canvas column through `x = 0`, from the
   * top of the canvas.
   */
  column: IsometricPixel[];

  /**
   * Where the camera puts world Y positions down that column, in device
   * pixels from the top of the canvas, keyed by the world Y.
   */
  predictedRows: Record<number, number>;

  /** How many chunks the layer has. */
  chunkCount: number;
}

/** The handle `tilemap-isometric-overlap.spec.ts` drives and asserts against. */
export interface IsometricOverlapSceneHandle extends SceneHandle {
  /**
   * Paints one of the scene's cells with a tile of `color`, or clears it
   * for `null`.
   */
  paint(cell: IsometricCellName, color: IsometricTileColor | null): void;

  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): IsometricOverlapMeasurement;
}

/**
 * Draws the atlas: one solid cell per entry of `tileColors`.
 * @returns The canvas to upload.
 */
function drawAtlas(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = tileColors.length * atlasCellSize;
  source.height = atlasCellSize;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  tileColors.forEach((color, index) => {
    context.fillStyle = atlasFills[color];
    context.fillRect(index * atlasCellSize, 0, atlasCellSize, atlasCellSize);
  });

  return source;
}

// Generous thresholds: this only tells the scene's few, very different
// colors apart.
const classify = (r: number, g: number, b: number): IsometricPixel => {
  if (r > 180 && g < 100 && b < 100) {
    return 'red';
  }

  if (b > 180 && r < 100 && g < 100) {
    return 'blue';
  }

  if (g > 180 && r < 100 && b < 100) {
    return 'green';
  }

  return 'background';
};

/**
 * Builds an isometric tilemap layer of two-cell-tall tiles, all from one
 * atlas, whose cells overlap down a vertical line through the origin. A
 * layer draws its cells back to front, row by row, so a tile in a higher
 * row covers the top of its image's overlap with the tile in the row
 * behind it. A static camera looks at the origin.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): IsometricOverlapSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
  });

  const texture = createTexture(renderContext, drawAtlas(), {
    filter: 'nearest',
  });
  const tileSet = createTileSet({
    layout: createIsometricGridLayout({ cellWidth, cellHeight }),
    sources: [
      {
        atlas: createGridTextureAtlas(texture, {
          cellWidth: atlasCellSize,
          cellHeight: atlasCellSize,
        }),
        tileHeight,
      },
    ],
  });

  const layerEntity = world.createEntity();

  addPositionComponent(world, layerEntity);

  const layer = addTilemapLayerComponent(world, layerEntity, { tileSet });

  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    paint(cell: IsometricCellName, color: IsometricTileColor | null): void {
      const { column, row } = cells[cell];

      if (color === null) {
        clearTile(layer, column, row);

        return;
      }

      setTile(
        layer,
        column,
        row,
        packTile({ source: 0, tile: tileColors.indexOf(color) }),
      );
    },

    measure(): IsometricOverlapMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      // The camera's view converts world positions to CSS pixels; the
      // drawing buffer is in device pixels.
      const view = getCameraView(world, cameraEntity, renderContext);

      const toDevicePixels = (worldX: number, worldY: number) => {
        const viewport = view.worldToViewport({ x: worldX, y: worldY });

        return {
          x: viewport.x * renderContext.pixelRatio,
          y: viewport.y * renderContext.pixelRatio,
        };
      };

      const columnX = Math.round(toDevicePixels(0, 0).x);
      const { data } = context2d.getImageData(columnX, 0, 1, canvas.height);
      const column: IsometricPixel[] = [];

      for (let y = 0; y < canvas.height; y++) {
        const offset = y * 4;

        column.push(classify(data[offset], data[offset + 1], data[offset + 2]));
      }

      const predictedRows: Record<number, number> = {};

      for (const worldY of [-64, -32, 0, 32, 64]) {
        predictedRows[worldY] = toDevicePixels(0, worldY).y;
      }

      return {
        column,
        predictedRows,
        chunkCount: layer.chunks.size,
      };
    },
  };
};
