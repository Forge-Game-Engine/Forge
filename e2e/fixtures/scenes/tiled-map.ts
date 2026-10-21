import {
  addCameraComponent,
  addPositionComponent,
  Color,
  createCanvas,
  createRenderContext,
  createRenderEcsSystem,
  createTilemapRenderEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  getCameraView,
  spawnTiledMap,
  TiledMapCache,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// The map, its external tileset and its image are served as static files
// beside each other, so the loader finds them from the map's URL.
const mapUrl = 'assets/tiled-map/map.tmj';

// A tile is 16 x 16 world units (one Tiled pixel per unit). The camera
// shows 200 world units of height on the 600 device pixel tall canvas, so a
// world unit is 3 device pixels.
const verticalWorldUnits = 200;
const tileSize = 16;

// The map is 12 x 2 tiles; the camera looks at its center.
const mapCenter = { x: 96, y: 16 };

// The Markers layer's tile 0 copies, in columns 0, 2, 4 and 6 of row 0:
// unflipped, flipped X, flipped Y and transposed (Tiled's diagonal flag).
const markerColumns = [0, 2, 4, 6];

// The Twin layer's green tile is in column 8. The Shifted layer's is in
// column 10, in a group: the group and the layer are each offset 8 down.
const twinColumn = 8;
const shiftedColumn = 10;

/** A rect of pixels, in device pixels from the canvas's top-left, inclusive. */
export interface TiledMapPixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Where a marked tile's yellow marker drew, relative to its cell. */
export interface TiledMapMarker {
  /** How many of the cell's pixels show the tile's blue. */
  bluePixels: number;

  /** How many show its yellow marker. */
  yellowPixels: number;

  /**
   * The marker's centroid minus the cell's center, in device pixels,
   * Y-down; `null` if no marker drew.
   */
  offset: { x: number; y: number } | null;
}

/** What `tiled-map.spec.ts` asserts against, from one frame. */
export interface TiledMapMeasurement {
  /** The marked tiles, in `markerColumns` order. */
  markers: TiledMapMarker[];

  /** The Twin layer's green tile's bounds, or `null` if none drew. */
  twin: TiledMapPixelBounds | null;

  /** The Shifted layer's green tile's bounds, or `null` if none drew. */
  shifted: TiledMapPixelBounds | null;

  /** Device pixels per world unit. */
  pixelsPerUnit: number;
}

/** The handle `tiled-map.spec.ts` drives and asserts against. */
export interface TiledMapSceneHandle extends SceneHandle {
  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): TiledMapMeasurement;
}

type PixelKind = 'blue' | 'yellow' | 'green' | 'other';

// Generous thresholds, not exact values: this only tells the tileset's
// three very different colors apart.
const classify = (r: number, g: number, b: number): PixelKind => {
  if (b > 160 && r < 120 && g < 140) {
    return 'blue';
  }

  if (r > 180 && g > 150 && b < 100) {
    return 'yellow';
  }

  if (g > 180 && r < 100 && b < 100) {
    return 'green';
  }

  return 'other';
};

/**
 * Loads a small Tiled map through `TiledMapCache`, with an external
 * tileset whose image is a blue tile with a yellow marker in its top-right
 * corner and a green tile, spawns it with `spawnTiledMap` and draws it.
 * One layer holds the marked tile with each of Tiled's flip flags, so the
 * marker shows where each flag turned or mirrored the tile; another layer,
 * in an offset group and offset itself, holds a green tile that should
 * draw lower than its twin in an unshifted layer by both offsets.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle, once the map has loaded.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TiledMapSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity, { local: { ...mapCenter } });

  const camera = addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: new Color(0.05, 0.05, 0.05),
    verticalWorldUnits,
  });

  const map = await new TiledMapCache(renderContext).getOrLoad(mapUrl);

  spawnTiledMap(world, map);

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

    measure(): TiledMapMeasurement {
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
      const kindAt = (x: number, y: number): PixelKind => {
        const offset = (y * canvas.width + x) * 4;

        return classify(data[offset], data[offset + 1], data[offset + 2]);
      };

      // The camera's view converts world positions to CSS pixels; the
      // drawing buffer is in device pixels.
      const view = getCameraView(world, cameraEntity, renderContext);
      const toDevicePixels = (
        worldX: number,
        worldY: number,
      ): { x: number; y: number } => {
        const viewport = view.worldToViewport({ x: worldX, y: worldY });

        return {
          x: viewport.x * renderContext.pixelRatio,
          y: viewport.y * renderContext.pixelRatio,
        };
      };

      const measureMarker = (column: number): TiledMapMarker => {
        const topLeft = toDevicePixels(column * tileSize, 0);
        const bottomRight = toDevicePixels((column + 1) * tileSize, tileSize);
        const center = {
          x: (topLeft.x + bottomRight.x) / 2,
          y: (topLeft.y + bottomRight.y) / 2,
        };
        let bluePixels = 0;
        let yellowPixels = 0;
        let sumX = 0;
        let sumY = 0;

        // Inset by a pixel, so a neighbor's edge pixels aren't counted.
        for (
          let y = Math.ceil(topLeft.y) + 1;
          y < Math.floor(bottomRight.y) - 1;
          y++
        ) {
          for (
            let x = Math.ceil(topLeft.x) + 1;
            x < Math.floor(bottomRight.x) - 1;
            x++
          ) {
            const kind = kindAt(x, y);

            if (kind === 'blue') {
              bluePixels++;
            } else if (kind === 'yellow') {
              yellowPixels++;
              sumX += x + 0.5;
              sumY += y + 0.5;
            }
          }
        }

        return {
          bluePixels,
          yellowPixels,
          offset:
            yellowPixels === 0
              ? null
              : {
                  x: sumX / yellowPixels - center.x,
                  y: sumY / yellowPixels - center.y,
                },
        };
      };

      // Every row of the canvas, within a column of cells.
      const measureGreen = (column: number): TiledMapPixelBounds | null => {
        const left = Math.ceil(toDevicePixels(column * tileSize, 0).x);
        const right = Math.floor(toDevicePixels((column + 1) * tileSize, 0).x);
        let bounds: TiledMapPixelBounds | null = null;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = Math.max(left - 2, 0); x < right + 2; x++) {
            if (kindAt(x, y) !== 'green') {
              continue;
            }

            bounds = bounds
              ? {
                  left: Math.min(bounds.left, x),
                  top: bounds.top,
                  right: Math.max(bounds.right, x),
                  bottom: y,
                }
              : { left: x, top: y, right: x, bottom: y };
          }
        }

        return bounds;
      };

      return {
        markers: markerColumns.map(measureMarker),
        twin: measureGreen(twinColumn),
        shifted: measureGreen(shiftedColumn),
        pixelsPerUnit:
          (renderContext.height / verticalWorldUnits) * camera.zoom,
      };
    },
  };
};
