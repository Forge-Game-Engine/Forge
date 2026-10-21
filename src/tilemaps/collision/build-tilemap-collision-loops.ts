import { Vector2 } from '../../math/index.js';
import {
  TilemapChunk,
  tilemapChunkSize,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import {
  getCellIndex,
  getChunkKey,
  isCellCoordinate,
  toChunkCoordinate,
} from '../cells/chunk-key.js';
import { getTileData, TileSet } from '../tile-set/tile-set.js';
import { emptyTile } from '../tiles/packed-tile.js';
import { getTileTransformBits } from '../tiles/packed-tile-bits.js';
import {
  addCollisionEdge,
  CollisionEdgeList,
  createCollisionEdgeList,
  linkCollisionLoops,
} from './link-collision-loops.js';
import {
  bottomSide,
  collisionSnapSteps,
  createTileCollisionVariant,
  fullCellVariant,
  leftSide,
  rightSide,
  SideContact,
  snapTileCollisionPolygon,
  TileCollisionVariant,
  topSide,
} from './tile-collision-variant.js';

/** The column and row offset of the neighbor across each side, by side index. */
const neighborOffsets: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** The side of the neighbor that faces each side, by side index. */
const facingSides: readonly number[] = [
  bottomSide,
  leftSide,
  topSide,
  rightSide,
];

const getVariant = (
  tileSet: TileSet,
  tile: number,
): TileCollisionVariant | null => {
  const { collision } = getTileData(tileSet, tile);

  if (collision === null) {
    return null;
  }

  if (collision === 'cell') {
    return fullCellVariant;
  }

  // createTileSet has checked this shape under every transform, so the
  // snapped points are a strictly convex polygon.
  return createTileCollisionVariant(
    snapTileCollisionPolygon(
      tileSet.layout,
      collision,
      getTileTransformBits(tile),
    ),
  );
};

/** Reads the tile across one side of a cell, from the cell's own chunk when it can. */
const getNeighborTile = (
  layer: TilemapLayerEcsComponent,
  chunk: TilemapChunk,
  column: number,
  row: number,
  side: number,
): number => {
  const [columnOffset, rowOffset] = neighborOffsets[side];
  const neighborColumn = column + columnOffset;
  const neighborRow = row + rowOffset;
  const chunkColumn = neighborColumn - chunk.column * tilemapChunkSize;
  const chunkRow = neighborRow - chunk.row * tilemapChunkSize;

  if (
    chunkColumn >= 0 &&
    chunkColumn < tilemapChunkSize &&
    chunkRow >= 0 &&
    chunkRow < tilemapChunkSize
  ) {
    return chunk.tiles[chunkRow * tilemapChunkSize + chunkColumn];
  }

  // Beyond the layer's last cell there's nothing, and its chunk key would
  // name another chunk.
  if (!isCellCoordinate(neighborColumn) || !isCellCoordinate(neighborRow)) {
    return emptyTile;
  }

  const neighborChunk = layer.chunks.get(
    getChunkKey(
      toChunkCoordinate(neighborColumn),
      toChunkCoordinate(neighborRow),
    ),
  );

  return neighborChunk
    ? neighborChunk.tiles[getCellIndex(neighborColumn, neighborRow)]
    : emptyTile;
};

/**
 * The parts of `own`'s edge along a side that `other` doesn't cover, split
 * where `other` touches the side at a single point.
 */
const subtractContact = (
  own: SideContact,
  other: SideContact | null,
): SideContact[] => {
  if (!other) {
    return [own];
  }

  if (other.min === other.max) {
    return other.min > own.min && other.min < own.max
      ? [
          { min: own.min, max: other.min },
          { min: other.min, max: own.max },
        ]
      : [own];
  }

  const pieces: SideContact[] = [];

  if (other.min > own.min) {
    pieces.push({ min: own.min, max: Math.min(other.min, own.max) });
  }

  if (other.max < own.max) {
    pieces.push({ min: Math.max(other.max, own.min), max: own.max });
  }

  return pieces.filter((piece) => piece.min < piece.max);
};

/** Adds a piece of a cell's side as an edge, in the direction that keeps solid on its right. */
const addSideEdge = (
  edges: CollisionEdgeList,
  originX: number,
  originY: number,
  side: number,
  piece: SideContact,
): void => {
  const steps = collisionSnapSteps;
  const { min, max } = piece;

  if (side === topSide) {
    addCollisionEdge(edges, originX + min, originY, originX + max, originY);
  } else if (side === rightSide) {
    addCollisionEdge(
      edges,
      originX + steps,
      originY + min,
      originX + steps,
      originY + max,
    );
  } else if (side === bottomSide) {
    addCollisionEdge(
      edges,
      originX + max,
      originY + steps,
      originX + min,
      originY + steps,
    );
  } else {
    addCollisionEdge(edges, originX, originY + max, originX, originY + min);
  }
};

/**
 * Builds the outline of a layer's solid tiles: the union of every
 * non-empty cell's `TileData.collision` shape, moved by the cell's
 * transform bits within the cell footprint's bounds (transpose, then flip
 * X, then flip Y, in the bounds' normalized coordinates). For a square tile
 * that turns the shape with the image; a transposed non-square tile's
 * image turns out of its footprint, but its shape stays in it, since a
 * tile collides with its own cell only. Neighbors' shared edges are
 * removed, so bodies sliding along the outline never catch on a seam
 * between tiles, and straight runs are one edge, so a floor of 20 tiles is
 * one edge.
 *
 * The work happens in the layout's cell space, where every cell is a unit
 * square, so orthogonal and isometric layers give the same kind of result.
 * Points are snapped to `1/65,536` of a cell there, which is what makes
 * shared edges cancel exactly.
 *
 * This is what `createTilemapColliderEcsSystem` puts in a layer's
 * `ChainCollider`. Call it directly to draw the outline while debugging or
 * to build a collider for another entity. It visits every stored cell, so
 * don't call it every frame for a layer that hasn't changed.
 * @param layer - The layer.
 * @returns The loops, in the layer entity's local space, wound as
 * `ChainCollider` requires: positive signed area (clockwise on screen)
 * around solid and negative around holes. Loops may touch at a vertex,
 * where two tiles meet at a corner, but never cross. The loops and their
 * points come in a fixed order, so the same tiles give the same loops
 * however they were painted. A layer with no solid tiles gives no loops.
 */
export function buildTilemapCollisionLoops(
  layer: TilemapLayerEcsComponent,
): Vector2[][] {
  const { tileSet } = layer;
  const variants = new Map<number, TileCollisionVariant | null>();
  const edges = createCollisionEdgeList();

  const variantOf = (tile: number): TileCollisionVariant | null => {
    if (tile === emptyTile) {
      return null;
    }

    let variant = variants.get(tile);

    if (variant === undefined) {
      variant = getVariant(tileSet, tile);
      variants.set(tile, variant);
    }

    return variant;
  };

  for (const chunk of layer.chunks.values()) {
    const firstColumn = chunk.column * tilemapChunkSize;
    const firstRow = chunk.row * tilemapChunkSize;

    chunk.tiles.forEach((tile, index) => {
      const variant = variantOf(tile);

      if (!variant) {
        return;
      }

      const column = firstColumn + (index % tilemapChunkSize);
      const row = firstRow + Math.floor(index / tilemapChunkSize);
      const originX = column * collisionSnapSteps;
      const originY = row * collisionSnapSteps;

      variant.sides.forEach((own, side) => {
        if (!own || own.min === own.max) {
          return;
        }

        const neighbor = variantOf(
          getNeighborTile(layer, chunk, column, row, side),
        );
        const other = neighbor ? neighbor.sides[facingSides[side]] : null;

        for (const piece of subtractContact(own, other)) {
          addSideEdge(edges, originX, originY, side, piece);
        }
      });

      for (const [start, end] of variant.interiorEdges) {
        addCollisionEdge(
          edges,
          originX + start.x,
          originY + start.y,
          originX + end.x,
          originY + end.y,
        );
      }
    });
  }

  return linkCollisionLoops(edges, tileSet.layout);
}
