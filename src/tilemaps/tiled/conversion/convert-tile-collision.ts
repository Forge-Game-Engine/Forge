// Converts a tile's Tiled collision objects to its collision shape. Not
// exported from the package.

import type { GridLayout, Vector2 } from '../../../math/index.js';
import { degreesToRadians } from '../../../math/index.js';
import { calculateSignedArea } from '../../../physics/colliders/polygon-math.js';
import type { TileCollisionShape } from '../../tile-set/tile-set.js';
import type {
  TiledObjectFile,
  TiledTileSetFile,
} from '../file-data/tiled-file-data.js';
import { clipConvexPolygon, isConvexPolygon } from './clip-convex-polygon.js';

/** What a tile's collision shape is converted with. */
export interface TileCollisionContext {
  /** The map's layout, whose cell `(0, 0)` the shape is measured on. */
  readonly layout: GridLayout;

  /** The map's orientation. */
  readonly mapOrientation: 'orthogonal' | 'isometric';

  /** The map's tile width, in Tiled pixels. */
  readonly mapTileWidth: number;

  /** The map's tile height, in Tiled pixels. */
  readonly mapTileHeight: number;

  /** The tileset the tile is in. */
  readonly tileSet: TiledTileSetFile;

  /** The size the tile's image draws at, in world units. */
  readonly drawnSize: Readonly<Vector2>;

  /** The tile's `textureOrigin`, in world units. */
  readonly textureOrigin: Readonly<Vector2>;

  /** The tile, for error messages. */
  readonly describeTile: string;
}

/** How close, relative to the footprint, a clipped area counts as the whole cell. */
const wholeCellTolerance = 1e-9;

/** Points closer than this, in cells, are one point. */
const samePointTolerance = 1e-9;

const rotate = (point: Vector2, radians: number): Vector2 => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

/** The object's points relative to its `x`, `y`, before rotation, in Tiled pixels. */
const getObjectPoints = (
  object: TiledObjectFile,
  describeTile: string,
): readonly Vector2[] => {
  if (object.kind === 'rectangle') {
    return [
      { x: 0, y: 0 },
      { x: object.width, y: 0 },
      { x: object.width, y: object.height },
      { x: 0, y: object.height },
    ];
  }

  if (object.kind === 'polygon' && object.points) {
    if (!isConvexPolygon(object.points)) {
      throw new Error(
        `${describeTile}'s collision polygon (${object.path}) is concave or crosses itself. A tile's collision shape must be a rectangle or a convex polygon: split the tile's shape, or simplify it.`,
      );
    }

    return object.points;
  }

  throw new Error(
    `${describeTile}'s collision object (${object.path}) is a ${object.kind}. A tile's collision shape must be a rectangle or a convex polygon.`,
  );
};

/**
 * Maps a point of an orthogonal-grid tileset's collision object, in pixels
 * from the tile image's top-left, onto the image as drawn on cell `(0, 0)`,
 * so `tileoffset` and the drawn size move and scale it with the image.
 */
const createImageSpaceMap = (
  context: TileCollisionContext,
): ((point: Vector2) => Vector2) => {
  const { layout, tileSet, drawnSize, textureOrigin } = context;
  const bounds = layout.getCellFootprintBounds(0, 0);
  const center = layout.getCellCenter(0, 0);
  const left = bounds.min.x + textureOrigin.x;
  const top = bounds.max.y + textureOrigin.y - drawnSize.y;
  const scaleX = drawnSize.x / tileSet.tileWidth;
  const scaleY = drawnSize.y / tileSet.tileHeight;

  return (point) => ({
    x: left + point.x * scaleX - center.x,
    y: top + point.y * scaleY - center.y,
  });
};

const toTileLocalPoints = (
  object: TiledObjectFile,
  points: readonly Vector2[],
  context: TileCollisionContext,
): Vector2[] => {
  const { layout, tileSet, describeTile } = context;
  const radians = degreesToRadians(object.rotation);

  if (tileSet.grid?.orientation !== 'isometric') {
    // Tiled rotates the shape in the image's pixel space, about the
    // object's origin.
    const toLocal = createImageSpaceMap(context);

    return points.map((point) => {
      const rotated = rotate(point, radians);

      return toLocal({ x: object.x + rotated.x, y: object.y + rotated.y });
    });
  }

  const { width, height } = tileSet.grid;

  if (
    context.mapOrientation !== 'isometric' ||
    width !== context.mapTileWidth ||
    height !== context.mapTileHeight
  ) {
    throw new Error(
      `${describeTile} has collision objects drawn on an isometric ${width} x ${height} grid, which only an isometric map with ${width} x ${height} tiles can load, and the map is ${context.mapOrientation} with ${context.mapTileWidth} x ${context.mapTileHeight} tiles.`,
    );
  }

  // On an isometric grid, Tiled stores the points in projected pixels, in
  // which the cell is `height` along each axis, and rotates the projected
  // shape on screen about its projected origin.
  const project = (point: Vector2): Vector2 =>
    layout.cellSpaceToLocal({ x: point.x / height, y: point.y / height });
  const center = layout.getCellCenter(0, 0);
  const origin = project({ x: object.x, y: object.y });

  return points.map((point) => {
    const rotated = rotate(project(point), radians);

    return {
      x: origin.x + rotated.x - center.x,
      y: origin.y + rotated.y - center.y,
    };
  });
};

const removeRepeatedPoints = (
  points: readonly Vector2[],
  tolerance: number,
): Vector2[] =>
  points.filter((point, index) => {
    const next = points[(index + 1) % points.length];

    return (
      Math.abs(point.x - next.x) > tolerance ||
      Math.abs(point.y - next.y) > tolerance
    );
  });

/**
 * Converts a tile's collision objects to its `TileData.collision`, in
 * tile-local space (from the center of cell `(0, 0)`'s footprint). A shape
 * reaching outside the footprint, such as a rectangle over a tall wall's
 * whole image, is clipped to it, since a tile collides with its own cell
 * only; a shape that covers the footprint becomes `'cell'`.
 * @param objects - The tile's collision objects, or `null` if it has none.
 * @param context - The tile, its tileset and the map's layout.
 * @returns The collision shape.
 * @throws An error naming the tile if it has more than one object, the
 * object isn't a rectangle or a convex polygon, the shape is outside the
 * footprint, or an isometric grid's size isn't the map's tile size.
 */
export const toTileCollisionShape = (
  objects: readonly TiledObjectFile[] | null,
  context: TileCollisionContext,
): TileCollisionShape => {
  const { layout, describeTile } = context;

  if (objects === null || objects.length === 0) {
    return null;
  }

  if (objects.length > 1) {
    throw new Error(
      `${describeTile} has ${objects.length} collision objects, and a tile can have one. Merge them into one rectangle or convex polygon in Tiled.`,
    );
  }

  const [object] = objects;
  const shape = toTileLocalPoints(
    object,
    getObjectPoints(object, describeTile),
    context,
  );
  const center = layout.getCellCenter(0, 0);
  const footprint = layout
    .getCellPolygon(0, 0)
    .map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
  const footprintArea = calculateSignedArea(footprint);
  const tolerance =
    samePointTolerance * Math.max(layout.cellWidth, layout.cellHeight);
  const clipped = removeRepeatedPoints(
    clipConvexPolygon(shape, footprint),
    tolerance,
  );
  const area = Math.abs(calculateSignedArea(clipped));

  if (clipped.length < 3 || area <= wholeCellTolerance * footprintArea) {
    throw new Error(
      `${describeTile}'s collision ${object.kind} (${object.path}) doesn't cover any of its cell's footprint. A tile collides with its own cell only, so draw its shape over the cell's footprint (its base, for a tall tile).`,
    );
  }

  if (Math.abs(area - footprintArea) <= wholeCellTolerance * footprintArea) {
    return 'cell';
  }

  return clipped;
};
