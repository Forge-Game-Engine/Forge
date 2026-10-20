import {
  addPositionComponent,
  addSpriteComponent,
  Axis1dAction,
  Axis2dAction,
  CameraEcsComponent,
  cameraId,
  Color,
  createAtlasSprite,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createGridTextureAtlas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTransformEcsSystem,
  EcsWorld,
  getCameraView,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  MouseAxis1dBinding,
  MouseInputSource,
  PositionEcsComponent,
  positionId,
  registerInputs,
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

// The block of tiles, drawn edge to edge around the world's origin.
const blockColumns = 6;
const blockRows = 4;
const blockHalfWidth = (blockColumns * tileSizeInWorldUnits) / 2;
const blockHalfHeight = (blockRows * tileSizeInWorldUnits) / 2;

// The center of the tile right of and below the block's center, in world
// units: the pixel every other pixel in the block is compared with.
const referenceTileCenter = {
  x: tileSizeInWorldUnits / 2,
  y: tileSizeInWorldUnits / 2,
};

/** The block of tiles' extent along one row of the canvas, as drawn. */
export interface RenderedBlockSpan {
  /** The leftmost pixel in the row drawn in the tiles' color. */
  left: number;
  /** The rightmost pixel in the row drawn in the tiles' color. */
  right: number;
}

/** What the block of tiles drew, and where the camera was. */
export interface RegionEdgesMeasurement {
  /**
   * The fraction (`0` to `1`) of the pixels inside the block (and on the
   * canvas) that differ from the pixel at the center of a tile.
   */
  mismatchInsideBlock: number;
  /**
   * Whether the pixel at a tile's center differs from the background just
   * outside the block, showing the tiles drew at all.
   */
  tileDiffersFromBackground: boolean;
  /**
   * The block's extent, in device pixels, along the row through the
   * reference tile's center, found by scanning the presented canvas for the
   * tile's color, or `null` if no pixel in the row has it.
   */
  renderedBlock: RenderedBlockSpan | null;
  /** The camera's zoom. */
  zoom: number;
  /** The camera's local position. */
  cameraPosition: { x: number; y: number };
  /** The canvas's device pixels per world unit at zoom `1`. */
  devicePixelsPerUnitAtZoomOne: number;
}

/**
 * The scene's handle: a block of tiles cut from a sheet by a grid atlas,
 * seen through a camera zoomed by the mouse wheel and panned by the arrow
 * keys.
 */
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

const clampToCanvas = (value: number, size: number): number =>
  Math.min(Math.max(value, 0), size);

/**
 * Builds a scene that tiles one cell of a linearly filtered sheet, whose
 * neighbors in the sheet are transparent, edge to edge at a fractional
 * scale, under a camera the mouse wheel zooms and the arrow keys pan. Each
 * tile should sample only its own cell at every zoom and camera position,
 * so the block draws as one solid color, with no seams where the tiles
 * meet.
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

  const zoomInput = new Axis1dAction('zoom');
  const panInput = new Axis2dAction('pan');
  const inputManager = registerInputs(world, time, {
    axis1dActions: [zoomInput],
    axis2dActions: [panInput],
  });
  const mouseInputSource = new MouseInputSource(inputManager, canvas);
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(zoomInput));
  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      panInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  const cameraEntity = createCamera(world, {
    zoomInput,
    panInput,
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

  world.addSystem(createCameraEcsSystem(time));
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
      const blockMin = toDevicePixels(-blockHalfWidth, -blockHalfHeight);
      const blockMax = toDevicePixels(blockHalfWidth, blockHalfHeight);

      // The block's pixels on the canvas, kept two pixels in from its outer
      // edges, which land partway through pixels.
      const left = clampToCanvas(Math.ceil(blockMin.x) + 2, canvas.width);
      const right = clampToCanvas(Math.floor(blockMax.x) - 2, canvas.width);
      const top = clampToCanvas(Math.ceil(blockMin.y) + 2, canvas.height);
      const bottom = clampToCanvas(Math.floor(blockMax.y) - 2, canvas.height);

      const referencePixel = toDevicePixels(
        referenceTileCenter.x,
        referenceTileCenter.y,
      );
      const referenceRow = Math.round(referencePixel.y);
      const reference = offsetOf(Math.round(referencePixel.x), referenceRow);
      const background = offsetOf(
        clampToCanvas(Math.floor(blockMin.x) - 10, canvas.width - 1),
        clampToCanvas(Math.floor(blockMin.y) - 10, canvas.height - 1),
      );

      let mismatches = 0;
      let pixels = 0;

      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          mismatches += pixelsDiffer(data, offsetOf(x, y), reference) ? 1 : 0;
          pixels++;
        }
      }

      let renderedLeft = -1;
      let renderedRight = -1;

      for (let x = 0; x < canvas.width; x++) {
        if (!pixelsDiffer(data, offsetOf(x, referenceRow), reference)) {
          if (renderedLeft === -1) {
            renderedLeft = x;
          }

          renderedRight = x;
        }
      }

      const camera = world.getComponent<CameraEcsComponent>(
        cameraEntity,
        cameraId,
      );
      const cameraPosition = world.getComponent<PositionEcsComponent>(
        cameraEntity,
        positionId,
      );

      if (!camera || !cameraPosition) {
        throw new Error('The camera entity lost its components');
      }

      return {
        mismatchInsideBlock: pixels === 0 ? 1 : mismatches / pixels,
        tileDiffersFromBackground: pixelsDiffer(data, reference, background),
        renderedBlock:
          renderedLeft === -1
            ? null
            : { left: renderedLeft, right: renderedRight },
        zoom: camera.zoom,
        cameraPosition: {
          x: cameraPosition.local.x,
          y: cameraPosition.local.y,
        },
        devicePixelsPerUnitAtZoomOne: renderContext.height / verticalWorldUnits,
      };
    },
  };
};
