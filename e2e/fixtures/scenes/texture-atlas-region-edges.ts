import {
  addPositionComponent,
  addSpriteComponent,
  Color,
  createAtlasSprite,
  createCamera,
  createCanvas,
  createGridTextureAtlas,
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

// The sheet: 3 x 3 cells of 8 x 8 texels with no spacing or margin. Only
// the center cell is painted; the cells around it are transparent, like the
// empty cells next to a tile in a tileset.
const cellSize = 8;
const sheetCells = 3;
const tileIndex = 4;
const tileFill = '#80d0ff';

// Each tile is 64 world units, and the camera shows a height that doesn't
// divide into whole pixels per unit, so tile edges land partway through
// pixels and every texel spans about seven of them: linear filtering
// reaching outside a tile's cell shows as a wide seam.
const tileSizeInWorldUnits = 64;
const pixelsPerUnit = cellSize / tileSizeInWorldUnits;
const verticalWorldUnits = 651;

// The block of tiles, drawn edge to edge around the center of the screen.
const blockColumns = 6;
const blockRows = 4;

/** What the block of tiles drew. */
export interface RegionEdgesMeasurement {
  /**
   * The fraction (`0` to `1`) of the pixels inside the block that differ
   * from the pixel at the center of a tile.
   */
  mismatchInsideBlock: number;
  /**
   * Whether the pixel at a tile's center differs from the background just
   * outside the block, showing the tiles drew at all.
   */
  tileDiffersFromBackground: boolean;
}

/** The scene's handle: a block of tiles cut from a sheet by a grid atlas. */
export interface TextureAtlasRegionEdgesSceneHandle extends SceneHandle {
  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): RegionEdgesMeasurement;
}

/**
 * Draws the sheet: one opaque cell in the middle of transparent ones.
 * @returns The canvas to upload.
 */
function drawSheet(): HTMLCanvasElement {
  const source = document.createElement('canvas');
  const size = sheetCells * cellSize;

  source.width = size;
  source.height = size;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  const column = tileIndex % sheetCells;
  const row = Math.floor(tileIndex / sheetCells);

  context.fillStyle = tileFill;
  context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize);

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
 * Builds a scene that tiles one cell of a linearly filtered sheet, whose
 * neighbors in the sheet are transparent, edge to edge at a fractional
 * scale. Each tile should sample only its own cell, so the block draws as
 * one solid color, with no seams where the tiles meet.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TextureAtlasRegionEdgesSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.05, 0.05, 0.05),
    verticalWorldUnits,
  });

  const texture = createTexture(renderContext, drawSheet(), {
    filter: 'linear',
  });
  const atlas = createGridTextureAtlas(texture, {
    cellWidth: cellSize,
    cellHeight: cellSize,
  });

  for (let row = 0; row < blockRows; row++) {
    for (let column = 0; column < blockColumns; column++) {
      const entity = world.createEntity();

      addPositionComponent(world, entity, {
        local: {
          x: (column - (blockColumns - 1) / 2) * tileSizeInWorldUnits,
          y: (row - (blockRows - 1) / 2) * tileSizeInWorldUnits,
        },
      });
      addSpriteComponent(
        world,
        entity,
        createAtlasSprite(atlas, tileIndex, { pixelsPerUnit }),
      );
    }
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): RegionEdgesMeasurement {
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
      const offsetOf = (x: number, y: number): number =>
        (y * canvas.width + x) * 4;

      // The block's pixels, kept two pixels in from its outer edges, which
      // land partway through pixels.
      const halfWidth =
        (blockColumns * tileSizeInWorldUnits * devicePixelsPerUnit) / 2;
      const halfHeight =
        (blockRows * tileSizeInWorldUnits * devicePixelsPerUnit) / 2;
      const left = Math.ceil(canvas.width / 2 - halfWidth) + 2;
      const right = Math.floor(canvas.width / 2 + halfWidth) - 2;
      const top = Math.ceil(canvas.height / 2 - halfHeight) + 2;
      const bottom = Math.floor(canvas.height / 2 + halfHeight) - 2;

      // The center of the tile right of and below the block's center.
      const tileCenterInPixels =
        (tileSizeInWorldUnits / 2) * devicePixelsPerUnit;
      const reference = offsetOf(
        Math.round(canvas.width / 2 + tileCenterInPixels),
        Math.round(canvas.height / 2 + tileCenterInPixels),
      );
      const background = offsetOf(left - 10, top - 10);

      let mismatches = 0;
      let pixels = 0;

      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          mismatches += pixelsDiffer(data, offsetOf(x, y), reference) ? 1 : 0;
          pixels++;
        }
      }

      return {
        mismatchInsideBlock: mismatches / pixels,
        tileDiffersFromBackground: pixelsDiffer(data, reference, background),
      };
    },
  };
};
