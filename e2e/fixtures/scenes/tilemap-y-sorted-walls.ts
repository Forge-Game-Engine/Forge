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
  createIsometricGridLayout,
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
  positionId,
  setTile,
  Time,
  tilemapRenderStateId,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 300 world units of height on the 800 x 600 canvas: 2 device pixels per
// world unit.
const verticalWorldUnits = 300;

// 2:1 diamonds, 64 by 32 world units. Cell (c, r)'s center is at
// ((c - r) * 32, (c + r + 1) * 16), so its sort Y is (c + r + 1) * 16.
const cellWidth = 64;
const cellHeight = 32;

// The atlas: one row of solid 8 x 8 texel cells.
const atlasCellSize = 8;

const atlasFills = ['#ff0000', '#00ff00'] as const;
const wallTile = packTile({ source: 1, tile: 0 });
const floorTile = packTile({ source: 0, tile: 1 });

/**
 * The wall layer's cells. `front` is the wall the character walks past, at
 * cell (0, 0): sort Y 16, its two-cell-tall image spanning world y
 * [-32, 32] down `x = 0`. The other two make rows behind (sort Y -8) and in
 * front (sort Y 40) of it, off to the sides, so the layer has rows a
 * character can sort between.
 */
const wallCells = [
  { column: 0, row: 0 },
  { column: -3, row: 1 },
  { column: 3, row: -1 },
] as const;

/** What a sampled pixel shows, by its color. */
export type YSortedWallsPixel = 'wall' | 'floor' | 'character' | 'background';

/**
 * Where the character stands. Its feet are at `(0, y)` and it reaches 48
 * units up from them, so on `x = 0` it overlaps the wall at (0, 0).
 *
 * - `behind`: y `0`, sorting between the rows at -8 and 16, so behind the
 *   wall.
 * - `inFront`: y `32`, between the rows at 16 and 40, in front of it.
 * - `inFrontOfEveryRow`: y `100`, after every row.
 */
export type CharacterSpot = 'behind' | 'inFront' | 'inFrontOfEveryRow';

const characterSpots: Record<CharacterSpot, number> = {
  behind: 0,
  inFront: 32,
  inFrontOfEveryRow: 100,
};

const characterHeight = 48;

/** What `tilemap-y-sorted-walls.spec.ts` asserts against, from one frame. */
export interface YSortedWallsMeasurement {
  /**
   * What each pixel shows down the canvas column through `x = 0`, from the
   * top of the canvas.
   */
  column: YSortedWallsPixel[];

  /**
   * Where the camera puts world Y positions down that column, in device
   * pixels from the top of the canvas, keyed by the world Y.
   */
  predictedRows: Record<number, number>;

  /** The number of non-instanced indexed draws (mesh draws) in the frame. */
  meshDrawCalls: number;

  /** How many chunk meshes the floor layer draws. */
  floorMeshCount: number;

  /** How many sort rows the wall layer has. */
  wallRowCount: number;
}

/** The handle `tilemap-y-sorted-walls.spec.ts` drives and asserts against. */
export interface YSortedWallsSceneHandle extends SceneHandle {
  /** Shows the character at a spot, or hides it for `null`. */
  placeCharacter(spot: CharacterSpot | null): void;

  /**
   * Reads the presented canvas and the last step's draws. Must run in the
   * same `page.evaluate` task as the `step()` before it.
   */
  measure(): YSortedWallsMeasurement;
}

/**
 * Draws the atlas: a red cell for walls and a green one for the floor.
 * @returns The canvas to upload.
 */
function drawAtlas(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = atlasFills.length * atlasCellSize;
  source.height = atlasCellSize;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  atlasFills.forEach((fill, index) => {
    context.fillStyle = fill;
    context.fillRect(index * atlasCellSize, 0, atlasCellSize, atlasCellSize);
  });

  return source;
}

// Generous thresholds: this only tells the scene's few, very different
// colors apart.
const classify = (r: number, g: number, b: number): YSortedWallsPixel => {
  if (r > 180 && g < 100 && b < 100) {
    return 'wall';
  }

  if (g > 180 && r < 100 && b < 100) {
    return 'floor';
  }

  if (b > 180 && r < 100 && g < 100) {
    return 'character';
  }

  return 'background';
};

/**
 * Builds an isometric map under a y-sorting camera: a map root that hands
 * its layers to the y-sort, a green floor layer at order `-1` that draws
 * behind everything, and a y-sorted wall layer of red two-cell-tall walls
 * in three sort rows. A blue character sprite, a root of its own, walks
 * past the middle wall.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): YSortedWallsSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  // Count the frame's mesh draws: meshes draw with `drawElements`, sprites
  // with instanced draws.
  const { gl } = renderContext;
  const drawElements = gl.drawElements.bind(gl);
  let meshDrawCalls = 0;

  gl.drawElements = (mode, count, type, offset): void => {
    meshDrawCalls++;
    drawElements(mode, count, type, offset);
  };

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
    ySort: true,
  });

  const texture = createTexture(renderContext, drawAtlas(), {
    filter: 'nearest',
  });
  const atlas = createGridTextureAtlas(texture, {
    cellWidth: atlasCellSize,
    cellHeight: atlasCellSize,
  });
  const tileSet = createTileSet({
    layout: createIsometricGridLayout({ cellWidth, cellHeight }),
    // The floor's diamonds, and walls two cells tall.
    sources: [{ atlas }, { atlas, tileHeight: 2 * cellHeight }],
  });

  const mapEntity = world.createEntity();

  addPositionComponent(world, mapEntity);
  addDrawOrderComponent(world, mapEntity, { ySortChildren: true });

  const floorEntity = world.createEntity();

  addPositionComponent(world, floorEntity);
  addDrawOrderComponent(world, floorEntity, { order: -1 });
  world.setParent(floorEntity, mapEntity);
  fillTiles(
    addTilemapLayerComponent(world, floorEntity, { tileSet }),
    -3,
    -3,
    7,
    7,
    floorTile,
  );

  const wallEntity = world.createEntity();

  addPositionComponent(world, wallEntity);
  addDrawOrderComponent(world, wallEntity, { ySortChildren: true });
  world.setParent(wallEntity, mapEntity);

  const walls = addTilemapLayerComponent(world, wallEntity, { tileSet });

  for (const { column, row } of wallCells) {
    setTile(walls, column, row, wallTile);
  }

  const characterEntity = world.createEntity();

  addPositionComponent(world, characterEntity);
  addSpriteComponent(world, characterEntity, {
    ...createImageSprite(renderContext.whiteTexture),
    width: 24,
    height: characterHeight,
    // Its feet are at its position, the point it sorts at.
    pivot: { x: 0.5, y: 1 },
    tintColor: new Color(0, 0, 1, 1),
  });

  const characterVisibility = addVisibilityComponent(world, characterEntity, {
    visible: false,
  });

  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      meshDrawCalls = 0;
      time.update(clockInMilliseconds);
      world.update();
    },

    placeCharacter(spot: CharacterSpot | null): void {
      characterVisibility.visible = spot !== null;

      if (spot !== null) {
        world.getComponentRequired(characterEntity, positionId).local = {
          x: 0,
          y: characterSpots[spot],
        };
      }
    },

    measure(): YSortedWallsMeasurement {
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
      const column: YSortedWallsPixel[] = [];

      for (let y = 0; y < canvas.height; y++) {
        const offset = y * 4;

        column.push(classify(data[offset], data[offset + 1], data[offset + 2]));
      }

      const predictedRows: Record<number, number> = {};

      for (const worldY of [-48, -32, -16, 0, 32]) {
        predictedRows[worldY] = toDevicePixels(0, worldY).y;
      }

      const floorState = world.getComponentRequired(
        floorEntity,
        tilemapRenderStateId,
      );
      const wallState = world.getComponentRequired(
        wallEntity,
        tilemapRenderStateId,
      );

      return {
        column,
        predictedRows,
        meshDrawCalls,
        floorMeshCount: floorState.chunkMeshes.length,
        wallRowCount: wallState.ySortMeshes.reduce(
          (count, mesh) => count + mesh.rows.length,
          0,
        ),
      };
    },
  };
};
