import {
  addCameraComponent,
  addDrawOrderComponent,
  addPositionComponent,
  addSpriteComponent,
  addTilemapLayerComponent,
  addVisibilityComponent,
  Color,
  createCanvas,
  createGridTextureAtlas,
  createImageSprite,
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

// The camera shows 480 world units of height at zoom 1, and starts zoomed
// in to 1.5, so a world unit is 1.875 device pixels on the 800 x 600 canvas.
const verticalWorldUnits = 480;
const initialZoom = 1.5;

// The atlas: one row of 8 x 8 texel cells, each painted a solid color.
const atlasCellSize = 8;
const atlasColors = ['#3050e0', '#ffd000', '#00ff00'];
const backgroundTile = packTile({ source: 0, tile: 0 });
const foregroundTile = packTile({ source: 0, tile: 1 });
const landmarkTile = packTile({ source: 0, tile: 2 });

// Square cells, 32 world units a side.
const cellSize = 32;

// The background layer covers the whole view at any camera position the
// spec uses, from cell (-10, -7) to (9, 6): x and y in [-320, 320) and
// [-224, 224). The landmark tile sits in it at cell (-4, -3).
const background = { column: -10, row: -7, columns: 20, rows: 14 };
const landmarkCell = { column: -4, row: -3 };

// The foreground layer covers cells (2, -2) to (5, 1): x in [64, 192) and
// y in [-64, 64), to the right of the origin.
const foreground = { column: 2, row: -2, columns: 4, rows: 4 };

// The sprite is centered on the origin, 192 by 64 world units: x in
// [-96, 96] and y in [-32, 32], so its right end (x in [64, 96]) is under
// the foreground layer.
const spriteWidth = 192;
const spriteHeight = 64;

/** What a sampled pixel shows, by its color. */
export type TilemapLayersPixel =
  'sprite' | 'background' | 'foreground' | 'landmark' | 'other';

/** A rect of pixels, in device pixels from the canvas's top-left, inclusive. */
export interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** What `tilemap-layers.spec.ts` asserts against, from one frame. */
export interface TilemapLayersMeasurement {
  /**
   * What each pixel shows along the canvas row through the world's origin
   * (`y = 0`), which crosses the sprite and the foreground layer.
   */
  row: TilemapLayersPixel[];

  /**
   * Where the camera puts the edges of things along that row, in device
   * pixels, predicted from the camera's view: the sprite's left and right
   * edges and the foreground layer's.
   */
  predicted: {
    spriteLeft: number;
    spriteRight: number;
    foregroundLeft: number;
    foregroundRight: number;
  };

  /** The landmark tile's bounds on the canvas, or `null` if none drew. */
  landmark: PixelBounds | null;

  /** The camera's local position. */
  cameraPosition: { x: number; y: number };

  /** The camera's zoom. */
  zoom: number;

  /** The canvas's device pixels per world unit at zoom `1`. */
  devicePixelsPerUnitAtZoomOne: number;
}

/** The handle `tilemap-layers.spec.ts` drives and asserts against. */
export interface TilemapLayersSceneHandle extends SceneHandle {
  /** Shows or hides the sprite. */
  setSpriteVisible(visible: boolean): void;

  /**
   * Sets the sprite's `DrawOrderEcsComponent.order`. At `0` it draws in
   * hierarchy order, between the two layers; at `1` it draws after both.
   */
  setSpriteOrder(order: number): void;

  /** Moves the camera by `(x, y)` world units. */
  panCamera(x: number, y: number): void;

  /**
   * Reads the presented canvas. Must run in the same `page.evaluate` task
   * as the `step()` before it.
   */
  measure(): TilemapLayersMeasurement;
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
const classify = (r: number, g: number, b: number): TilemapLayersPixel => {
  if (r > 180 && g < 100 && b < 100) {
    return 'sprite';
  }

  if (r > 180 && g > 150 && b < 100) {
    return 'foreground';
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
 * Builds a two-layer orthogonal tilemap under a map entity: a background
 * layer filling the view with one landmark tile in a different color, then
 * a red sprite, then a foreground layer covering part of the background and
 * the sprite's right end. The map's children draw in sibling order, so the
 * sprite draws over the background layer's chunk meshes and under the
 * foreground layer's. A static camera, zoomed in, looks at the origin; the
 * spec pans it by known amounts.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TilemapLayersSceneHandle => {
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
    zoom: initialZoom,
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
      },
    ],
  });

  const mapEntity = world.createEntity();

  addPositionComponent(world, mapEntity);

  const backgroundEntity = world.createEntity();

  addPositionComponent(world, backgroundEntity);
  world.setParent(backgroundEntity, mapEntity);

  const backgroundLayer = addTilemapLayerComponent(world, backgroundEntity, {
    tileSet,
  });

  fillTiles(
    backgroundLayer,
    background.column,
    background.row,
    background.columns,
    background.rows,
    backgroundTile,
  );
  setTile(backgroundLayer, landmarkCell.column, landmarkCell.row, landmarkTile);

  const spriteEntity = world.createEntity();

  addPositionComponent(world, spriteEntity);
  addSpriteComponent(world, spriteEntity, {
    ...createImageSprite(renderContext.whiteTexture),
    width: spriteWidth,
    height: spriteHeight,
    tintColor: new Color(1, 0, 0, 1),
  });

  const spriteVisibility = addVisibilityComponent(world, spriteEntity);
  const spriteOrder = addDrawOrderComponent(world, spriteEntity, { order: 0 });

  world.setParent(spriteEntity, mapEntity);

  const foregroundEntity = world.createEntity();

  addPositionComponent(world, foregroundEntity);
  world.setParent(foregroundEntity, mapEntity);

  const foregroundLayer = addTilemapLayerComponent(world, foregroundEntity, {
    tileSet,
  });

  fillTiles(
    foregroundLayer,
    foreground.column,
    foreground.row,
    foreground.columns,
    foreground.rows,
    foregroundTile,
  );

  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setSpriteVisible(visible: boolean): void {
      spriteVisibility.visible = visible;
    },

    setSpriteOrder(order: number): void {
      spriteOrder.order = order;
    },

    panCamera(x: number, y: number): void {
      cameraPosition.local.x += x;
      cameraPosition.local.y += y;
    },

    measure(): TilemapLayersMeasurement {
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

      const classifyAt = (x: number, y: number): TilemapLayersPixel => {
        const offset = (y * canvas.width + x) * 4;

        return classify(data[offset], data[offset + 1], data[offset + 2]);
      };

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

      const rowY = Math.round(toDevicePixels(0, 0).y);
      const row: TilemapLayersPixel[] = [];

      for (let x = 0; x < canvas.width; x++) {
        row.push(classifyAt(x, rowY));
      }

      let landmark: PixelBounds | null = null;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (classifyAt(x, y) !== 'landmark') {
            continue;
          }

          landmark = landmark
            ? {
                left: Math.min(landmark.left, x),
                top: landmark.top,
                right: Math.max(landmark.right, x),
                bottom: y,
              }
            : { left: x, top: y, right: x, bottom: y };
        }
      }

      return {
        row,
        predicted: {
          spriteLeft: toDevicePixels(-spriteWidth / 2, 0).x,
          spriteRight: toDevicePixels(spriteWidth / 2, 0).x,
          foregroundLeft: toDevicePixels(foreground.column * cellSize, 0).x,
          foregroundRight: toDevicePixels(
            (foreground.column + foreground.columns) * cellSize,
            0,
          ).x,
        },
        landmark,
        cameraPosition: {
          x: cameraPosition.local.x,
          y: cameraPosition.local.y,
        },
        zoom: camera.zoom,
        devicePixelsPerUnitAtZoomOne: renderContext.height / verticalWorldUnits,
      };
    },
  };
};
