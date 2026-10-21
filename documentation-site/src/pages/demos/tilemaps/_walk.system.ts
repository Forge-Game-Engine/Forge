import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  emptyTile,
  getTile,
  getTileData,
  localToCell,
  TileData,
  tilemapLayerId,
} from '@forge-game-engine/forge/tilemaps';
import { WalkerEcsComponent, walkerId } from './_walker.component';

/**
 * The tile data of every non-empty cell holding a point of the layers'
 * local space, one per layer that has a tile there.
 */
const getTileDataAt = (
  world: EcsWorld,
  layers: readonly number[],
  point: Vector2,
): TileData[] =>
  layers.flatMap((entity) => {
    const layer = world.getComponent(entity, tilemapLayerId);

    if (!layer) {
      return [];
    }

    const { column, row } = localToCell(layer, point);
    const tile = getTile(layer, column, row);

    return tile === emptyTile ? [] : [getTileData(layer.tileSet, tile)];
  });

const isWalkable = (tiles: readonly TileData[]): boolean =>
  tiles.length > 0 && tiles.every((data) => data.properties.walkable === true);

const getSpeed = (tiles: readonly TileData[]): number =>
  tiles.reduce((speed, data) => {
    const tileSpeed = data.properties.speed;

    return typeof tileSpeed === 'number' ? speed * tileSpeed : speed;
  }, 1);

/**
 * Creates the system that walks entities over tilemap layers with
 * `moveInput`. Each tick it reads the tiles under the walker: their `speed`
 * properties scale how far the walker goes. The walker moves along X and Y
 * separately, and only into a cell whose tiles are all `walkable`, so it
 * slides along the shore or a wall instead of stopping. A walker already on
 * a cell it couldn't enter (one painted under it) can walk off it.
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
      const { layers, speed } = walkers[i];
      const position = positions[i].local;
      const here = getTileDataAt(world, layers, position);
      const distance =
        (speed * getSpeed(here) * time.deltaTimeInSeconds) / scale;
      const canLeave = !isWalkable(here);

      const nextX = { x: position.x + x * distance, y: position.y };

      if (canLeave || isWalkable(getTileDataAt(world, layers, nextX))) {
        position.x = nextX.x;
      }

      const nextY = { x: position.x, y: position.y + y * distance };

      if (canLeave || isWalkable(getTileDataAt(world, layers, nextY))) {
        position.y = nextY.y;
      }
    }
  },
});
