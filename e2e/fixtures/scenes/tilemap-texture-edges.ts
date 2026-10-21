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
  RenderContext,
  setTileSet,
  TextureFilter,
  TileSet,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// The sheet: 3 x 3 cells of 8 x 8 texels with no spacing or margin. The
// center cell is the tile; every cell around it is painted a contrasting
// color, so a tile that samples past its own cell shows it.
const atlasCellSize = 8;
const sheetCells = 3;
const tileIndex = 4;
const tileFill = '#80d0ff';
const contrastFill = '#ff00ff';

// Each cell is 64 world units, and the camera shows a height that doesn't
// divide into whole pixels per unit, so tile edges land partway through
// pixels.
const cellSize = 64;
const verticalWorldUnits = 651;

// The block of tiles: cells (-3, -2) to (2, 1), x in [-192, 192) and y in
// [-128, 128). It crosses the chunk boundaries at column 0 and row 0, so
// tiles meet across four chunk meshes as well as inside each.
const block = { column: -3, row: -2, columns: 6, rows: 4 };
const blockMin = { x: block.column * cellSize, y: block.row * cellSize };
const blockMax = {
  x: (block.column + block.columns) * cellSize,
  y: (block.row + block.rows) * cellSize,
};

// The center of the tile right of and below the block's center, in world
// units: the pixel every other pixel in the block is compared with.
const referenceTileCenter = { x: cellSize / 2, y: cellSize / 2 };

/** What the block of tiles drew, and where the camera was. */
export interface TilemapTextureEdgesMeasurement {
  /** How many pixels inside the block (and on the canvas) were compared. */
  pixels: number;

  /**
   * How many of those pixels differ from the pixel at the center of a
   * tile: any that show some of the contrasting color around the tile in
   * the sheet.
   */
  mismatchedPixels: number;

  /**
   * How many of those pixels are closer to the contrasting color than to
   * the tile's.
   */
  contrastPixels: number;

  /**
   * Whether the pixel at a tile's center is the tile's color rather than
   * the background's, showing the tiles drew at all.
   */
  tileDrew: boolean;

  /** The sampling filter of the layer's atlas texture. */
  filter: TextureFilter;

  /** The camera's zoom. */
  zoom: number;

  /** The camera's local position. */
  cameraPosition: { x: number; y: number };
}

/** The handle `tilemap-texture-edges.spec.ts` drives and asserts against. */
export interface TilemapTextureEdgesSceneHandle extends SceneHandle {
  /**
   * Gives the layer a tile set whose atlas texture samples with `filter`.
   */
  setFilter(filter: TextureFilter): void;

  /** Moves the camera to `(x, y)` world units and sets its zoom. */
  setCamera(x: number, y: number, zoom: number): void;

  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): TilemapTextureEdgesMeasurement;
}

/**
 * Draws the sheet: the tile in the middle, the contrasting color around it.
 * @returns The canvas to upload.
 */
function drawSheet(): HTMLCanvasElement {
  const source = document.createElement('canvas');
  const size = sheetCells * atlasCellSize;

  source.width = size;
  source.height = size;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.fillStyle = contrastFill;
  context.fillRect(0, 0, size, size);

  const column = tileIndex % sheetCells;
  const row = Math.floor(tileIndex / sheetCells);

  context.fillStyle = tileFill;
  context.fillRect(
    column * atlasCellSize,
    row * atlasCellSize,
    atlasCellSize,
    atlasCellSize,
  );

  return source;
}

const createSheetTileSet = (
  renderContext: RenderContext,
  sheet: HTMLCanvasElement,
  filter: TextureFilter,
): TileSet =>
  createTileSet({
    layout: createOrthogonalGridLayout({
      cellWidth: cellSize,
      cellHeight: cellSize,
    }),
    sources: [
      {
        atlas: createGridTextureAtlas(
          createTexture(renderContext, sheet, { filter }),
          { cellWidth: atlasCellSize, cellHeight: atlasCellSize },
        ),
      },
    ],
  });

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

// The tile is light blue (0x80, 0xd0, 0xff) and the contrasting color
// magenta (0xff, 0x00, 0xff): they differ most in green, so a pixel with
// less green than halfway between them is closer to the contrasting color.
const isCloserToContrast = (data: Uint8ClampedArray, offset: number): boolean =>
  data[offset + 1] < 0x68;

const clampToCanvas = (value: number, size: number): number =>
  Math.min(Math.max(value, 0), size);

/**
 * Builds a scene that fills a block of cells of an orthogonal tilemap layer
 * with one tile, cut from a sheet where every cell around it is a
 * contrasting color, at a fractional scale. The spec moves the static
 * camera through fractional positions and zooms. Every tile should sample
 * only its own cell, so the block draws as one solid color with no trace of
 * the contrasting color where tiles meet, with either filter.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TilemapTextureEdgesSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const cameraEntity = world.createEntity();
  const cameraPosition = addPositionComponent(world, cameraEntity);
  const camera = addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: new Color(0.05, 0.05, 0.05),
    verticalWorldUnits,
  });

  const sheet = drawSheet();
  const tileSets: Record<TextureFilter, TileSet> = {
    nearest: createSheetTileSet(renderContext, sheet, 'nearest'),
    linear: createSheetTileSet(renderContext, sheet, 'linear'),
  };
  let filter: TextureFilter = 'nearest';

  const layerEntity = world.createEntity();

  addPositionComponent(world, layerEntity);

  const layer = addTilemapLayerComponent(world, layerEntity, {
    tileSet: tileSets[filter],
  });

  fillTiles(
    layer,
    block.column,
    block.row,
    block.columns,
    block.rows,
    packTile({ source: 0, tile: tileIndex }),
  );

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

    setFilter(newFilter: TextureFilter): void {
      filter = newFilter;
      setTileSet(layer, tileSets[filter]);
    },

    setCamera(x: number, y: number, zoom: number): void {
      cameraPosition.local.x = x;
      cameraPosition.local.y = y;
      camera.zoom = zoom;
    },

    measure(): TilemapTextureEdgesMeasurement {
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
      const offsetOf = (x: number, y: number): number =>
        (y * canvas.width + x) * 4;

      // Where the camera puts the block, converted from the view's CSS
      // pixels to the drawing buffer's device pixels.
      const view = getCameraView(world, cameraEntity, renderContext);

      const toDevicePixels = (worldX: number, worldY: number) => {
        const viewport = view.worldToViewport({ x: worldX, y: worldY });

        return {
          x: viewport.x * renderContext.pixelRatio,
          y: viewport.y * renderContext.pixelRatio,
        };
      };

      const min = toDevicePixels(blockMin.x, blockMin.y);
      const max = toDevicePixels(blockMax.x, blockMax.y);

      // The block's pixels on the canvas, kept two pixels in from its outer
      // edges, which land partway through pixels.
      const left = clampToCanvas(Math.ceil(min.x) + 2, canvas.width);
      const right = clampToCanvas(Math.floor(max.x) - 2, canvas.width);
      const top = clampToCanvas(Math.ceil(min.y) + 2, canvas.height);
      const bottom = clampToCanvas(Math.floor(max.y) - 2, canvas.height);

      const referencePixel = toDevicePixels(
        referenceTileCenter.x,
        referenceTileCenter.y,
      );
      const reference = offsetOf(
        Math.round(referencePixel.x),
        Math.round(referencePixel.y),
      );

      let pixels = 0;
      let mismatchedPixels = 0;
      let contrastPixels = 0;

      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const offset = offsetOf(x, y);

          pixels++;
          mismatchedPixels += pixelsDiffer(data, offset, reference) ? 1 : 0;
          contrastPixels += isCloserToContrast(data, offset) ? 1 : 0;
        }
      }

      // The tile's light blue has far more blue than the background's
      // near-black.
      const tileDrew = data[reference + 2] > 200 && data[reference + 1] > 150;

      return {
        pixels,
        mismatchedPixels,
        contrastPixels,
        tileDrew,
        filter,
        zoom: camera.zoom,
        cameraPosition: {
          x: cameraPosition.local.x,
          y: cameraPosition.local.y,
        },
      };
    },
  };
};
