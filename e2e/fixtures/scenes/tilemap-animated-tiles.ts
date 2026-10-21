import {
  addCameraComponent,
  addPositionComponent,
  addTilemapLayerComponent,
  Color,
  createCanvas,
  createGridTextureAtlas,
  createOrthogonalGridLayout,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTilemapRenderEcsSystem,
  createTileSet,
  createTransformEcsSystem,
  EcsWorld,
  fillTiles,
  getCameraView,
  packTile,
  setTile,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

/** How long each of the animated tile's two frames shows. */
const frameDurationMilliseconds = 200;

// The atlas: one row of 8 x 8 texel cells, each painted a solid color. Tile
// 1 is the animated tile: its frames are tiles 1 and 2.
const atlasCellSize = 8;
const atlasColors = ['#3050e0', '#ff2020', '#ffd000', '#00ff00'];
const backgroundTile = packTile({ source: 0, tile: 0 });
const animatedTile = packTile({ source: 0, tile: 1 });
const landmarkTile = packTile({ source: 0, tile: 3 });

// Square cells, 64 world units a side. The background fills cells (-3, -2)
// to (2, 1) around the origin; the animated tile is at cell (0, 0) and the
// landmark at cell (-2, 0).
const cellSize = 64;
const animatedCell = { column: 0, row: 0 };
const landmarkCell = { column: -2, row: 0 };

/** What a sampled pixel shows, by its color. */
export type TilemapAnimatedTilesPixel =
  'background' | 'firstFrame' | 'secondFrame' | 'landmark' | 'other';

/** What `tilemap-animated-tiles.spec.ts` asserts against, from one frame. */
export interface TilemapAnimatedTilesMeasurement {
  /** What the pixel at the center of the animated tile's cell shows. */
  animatedCell: TilemapAnimatedTilesPixel;

  /** What the pixel at the center of the landmark's cell shows. */
  landmarkCell: TilemapAnimatedTilesPixel;

  /** How many pixels of the canvas show each kind. */
  counts: Record<TilemapAnimatedTilesPixel, number>;

  /** The scene's `time.timeInMilliseconds`. */
  timeInMilliseconds: number;
}

/** The handle `tilemap-animated-tiles.spec.ts` drives and asserts against. */
export interface TilemapAnimatedTilesSceneHandle extends SceneHandle {
  /** How long each frame of the animated tile shows, in milliseconds. */
  readonly frameDurationMilliseconds: number;

  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): TilemapAnimatedTilesMeasurement;
}

/**
 * Draws the atlas: one solid 8 x 8 cell per entry of `atlasColors`.
 * @returns The canvas to upload.
 */
function drawAtlas(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = atlasColors.length * atlasCellSize;
  source.height = atlasCellSize;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  atlasColors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index * atlasCellSize, 0, atlasCellSize, atlasCellSize);
  });

  return source;
}

// Generous thresholds, not exact values: this only tells the scene's few,
// very different colors apart.
const classify = (
  r: number,
  g: number,
  b: number,
): TilemapAnimatedTilesPixel => {
  if (r > 180 && g < 100 && b < 100) {
    return 'firstFrame';
  }

  if (r > 180 && g > 150 && b < 100) {
    return 'secondFrame';
  }

  if (b > 160 && r < 120 && g < 140) {
    return 'background';
  }

  if (g > 180 && r < 100 && b < 100) {
    return 'landmark';
  }

  return 'other';
};

/**
 * Builds one orthogonal tilemap layer filled with a static background tile,
 * with one animated tile whose two frames are red and yellow, and a static
 * green landmark tile beside it. A static camera looks at the origin.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TilemapAnimatedTilesSceneHandle => {
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
    clearColor: new Color(0.05, 0.05, 0.05),
    verticalWorldUnits: 480,
  });

  const texture = createTexture(renderContext, drawAtlas(), {
    filter: 'nearest',
  });
  const tileSet = createTileSet({
    layout: createOrthogonalGridLayout({
      cellWidth: cellSize,
      cellHeight: cellSize,
    }),
    sources: [
      {
        atlas: createGridTextureAtlas(texture, {
          cellWidth: atlasCellSize,
          cellHeight: atlasCellSize,
        }),
        tiles: new Map([
          [
            1,
            {
              animation: [
                { tile: 1, durationMilliseconds: frameDurationMilliseconds },
                { tile: 2, durationMilliseconds: frameDurationMilliseconds },
              ],
            },
          ],
        ]),
      },
    ],
  });

  const layerEntity = world.createEntity();

  addPositionComponent(world, layerEntity);

  const layer = addTilemapLayerComponent(world, layerEntity, { tileSet });

  fillTiles(layer, -3, -2, 6, 4, backgroundTile);
  setTile(layer, animatedCell.column, animatedCell.row, animatedTile);
  setTile(layer, landmarkCell.column, landmarkCell.row, landmarkTile);

  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    frameDurationMilliseconds,

    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): TilemapAnimatedTilesMeasurement {
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

      const classifyAt = (x: number, y: number): TilemapAnimatedTilesPixel => {
        const offset = (y * canvas.width + x) * 4;

        return classify(data[offset], data[offset + 1], data[offset + 2]);
      };

      // The camera's view converts world positions to CSS pixels; the
      // drawing buffer is in device pixels.
      const view = getCameraView(world, cameraEntity, renderContext);

      const classifyCellCenter = (cell: {
        column: number;
        row: number;
      }): TilemapAnimatedTilesPixel => {
        const viewport = view.worldToViewport({
          x: (cell.column + 0.5) * cellSize,
          y: (cell.row + 0.5) * cellSize,
        });

        return classifyAt(
          Math.round(viewport.x * renderContext.pixelRatio),
          Math.round(viewport.y * renderContext.pixelRatio),
        );
      };

      const counts: Record<TilemapAnimatedTilesPixel, number> = {
        background: 0,
        firstFrame: 0,
        secondFrame: 0,
        landmark: 0,
        other: 0,
      };

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          counts[classifyAt(x, y)]++;
        }
      }

      return {
        animatedCell: classifyCellCenter(animatedCell),
        landmarkCell: classifyCellCenter(landmarkCell),
        counts,
        timeInMilliseconds: time.timeInMilliseconds,
      };
    },
  };
};
