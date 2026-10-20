import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  emptyTile,
  getTile,
  getTileData,
  localToCell,
  TileData,
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '@forge-game-engine/forge/tilemaps';
import { WalkerEcsComponent, walkerId } from './_walker.component';

/** The tile data of the cell holding a point of the layer's local space, or `null` for an empty cell. */
const getTileDataAt = (
  layer: TilemapLayerEcsComponent,
  point: Vector2,
): TileData | null => {
  const { column, row } = localToCell(layer, point);
  const tile = getTile(layer, column, row);

  return tile === emptyTile ? null : getTileData(layer.tileSet, tile);
};

const isWalkable = (data: TileData | null): boolean =>
  data !== null && data.properties.walkable === true;

const getSpeed = (data: TileData | null): number => {
  const speed = data?.properties.speed;

  return typeof speed === 'number' ? speed : 1;
};

/**
 * Creates the system that walks entities over a tilemap layer with
 * `moveInput`. Each tick it reads the tile under the walker: its `speed`
 * property scales how far the walker goes. The walker moves along X and Y
 * separately, and only into a cell whose tile is `walkable`, so it slides
 * along the shore instead of stopping. A walker already on a tile that
 * isn't walkable (one painted under it) can walk off it.
 * @param time - The game's time, for the frame's delta.
 * @param moveInput - The move axis, Y-down like the world.
 * @returns The walk ECS system.
 */
export const createWalkEcsSystem = (
  time: Time,
  moveInput: Axis2dAction,
): EcsSystem<[WalkerEcsComponent, PositionEcsComponent]> => ({
  query: [walkerId, positionId],
  update: (world, { components: [walkers, positions] }) => {
    const { x, y } = moveInput.value;
    const length = Math.hypot(x, y);

    if (length === 0) {
      return;
    }

    // Diagonals are no faster than straight lines.
    const scale = Math.max(length, 1);

    for (let i = 0; i < walkers.length; i++) {
      const layer = world.getComponent(walkers[i].ground, tilemapLayerId);

      if (!layer) {
        continue;
      }

      const position = positions[i].local;
      const here = getTileDataAt(layer, position);
      const distance =
        (walkers[i].speed * getSpeed(here) * time.deltaTimeInSeconds) / scale;
      const canLeave = !isWalkable(here);

      const nextX = { x: position.x + x * distance, y: position.y };

      if (canLeave || isWalkable(getTileDataAt(layer, nextX))) {
        position.x = nextX.x;
      }

      const nextY = { x: position.x, y: position.y + y * distance };

      if (canLeave || isWalkable(getTileDataAt(layer, nextY))) {
        position.y = nextY.y;
      }
    }
  },
});
