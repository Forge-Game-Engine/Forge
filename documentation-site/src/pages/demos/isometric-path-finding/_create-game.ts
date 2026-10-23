import {
  addPositionComponent,
  createTransformEcsSystem,
  positionId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { createNavigationGrid } from '@forge-game-engine/forge/navigation';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  addDrawOrderComponent,
  addSpriteComponent,
  addVisibilityComponent,
  Color,
  createAtlasSprite,
  createCamera,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createTilemapColliderEcsSystem,
  createTilemapRenderEcsSystem,
  findTiledLayer,
  packTile,
  spawnTiledMap,
  TiledMap,
  TiledMapCache,
} from '@forge-game-engine/forge/tilemaps';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createBakeGridEcsSystem } from './_bake-grid.system';
import { addCellCursorComponent } from './_cell-cursor.component';
import { createCellCursorEcsSystem } from './_cell-cursor.system';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
import { createFindPathEcsSystem } from './_find-path.system';
import { addNavigationDemoComponent } from './_navigation.component';
import { createPlayerMoveEcsSystem } from './_player-move.system';

/**
 * A cell is 32 Tiled pixels tall, and one Tiled pixel is one world unit, so
 * physics tuned for meters is scaled by 32.
 */
const pixelsPerMeter = 32;

/** A tile of the map's tile set, by its source and index in the source. */
interface TileRef {
  source: number;
  tile: number;
}

/**
 * Finds the tile whose custom property `name` is `true` in Tiled, in
 * whichever of the map's tilesets has it.
 */
const findTileWithProperty = (map: TiledMap, name: string): TileRef => {
  for (const [source, { tiles }] of map.tileSet.sources.entries()) {
    const tile = tiles.findIndex(({ properties }) => properties[name] === true);

    if (tile !== -1) {
      return { source, tile };
    }
  }

  throw new Error(`The map "${map.url}" has no tile with "${name}" set.`);
};

/**
 * Creates one hidden marker per cell, the terrain tileset's cursor tile (a
 * diamond outline) on draw layer 1, so the path shows over the walls and
 * the player.
 */
const createPathMarkers = (
  world: EcsWorld,
  map: TiledMap,
  count: number,
): number[] => {
  const cursorTile = findTileWithProperty(map, 'cursor');
  const sprite = createAtlasSprite(
    map.tileSet.sources[cursorTile.source].atlas,
    cursorTile.tile,
    { pixelsPerUnit: 1 },
  );
  const markers: number[] = [];

  for (let i = 0; i < count; i++) {
    const marker = world.createEntity();

    addPositionComponent(world, marker);
    addSpriteComponent(world, marker, { ...sprite, layer: 1 });
    addVisibilityComponent(world, marker, { visible: false });
    markers.push(marker);
  }

  return markers;
};

/**
 * Builds the isometric path finding demo: the courtyard of the isometric
 * tilemap demo, with a navigation grid that has the map's diamond cells,
 * baked from the walls' and the water's collision shapes, and the path from
 * the player to the cell under the mouse drawn on it. A click builds or
 * clears a wall, and the grid is baked again on the same frame.
 * @param mapUrl - The URL of the map's `.tmj` file.
 * @returns The created game.
 */
export const createIsometricPathFindingGame = async (
  mapUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const map = await new TiledMapCache(renderContext).getOrLoad(mapUrl);
  const spawned = spawnTiledMap(world, map);
  const floor = findTiledLayer(spawned, 'Floor').entity;
  const walls = findTiledLayer(spawned, 'Walls').entity;

  addDrawOrderComponent(world, floor, { order: -1 });
  addDrawOrderComponent(world, walls, { ySortChildren: true });

  const player = createPlayer(world, map);

  if (!map.size) {
    throw new Error(`The map "${map.url}" must be finite.`);
  }

  const { columns, rows } = map.size;
  const { layout } = map.tileSet;
  const middle = layout.cellSpaceToLocal({ x: columns / 2, y: rows / 2 });
  const overhang =
    Math.max(...map.tileSet.sources.map(({ tileHeight }) => tileHeight)) -
    layout.cellHeight;
  const camera = createCamera(world, {
    isStatic: true,
    clearColor: map.backgroundColor ?? Color.black,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    ySort: true,
  });
  const cameraPosition = world.getComponent(camera, positionId);

  if (cameraPosition) {
    cameraPosition.local.x = middle.x;
    cameraPosition.local.y = middle.y - overhang / 2;
  }

  const { moveInput, cursorInputs } = createInputs(world, time, game.container);
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  world.addSystem(createPlayerMoveEcsSystem(moveInput));
  // Picks the goal cell, and edits the walls layer before the tilemap
  // collider system rebuilds its collider.
  world.addSystem(createCellCursorEcsSystem(renderContext, cursorInputs));
  world.addSystem(createTilemapColliderEcsSystem());
  // Bakes the grid from the colliders built this tick, then finds the path
  // on it, so a new wall reroutes the path on the frame it's clicked.
  world.addSystem(createBakeGridEcsSystem());
  // Before the transform system, so the markers are drawn where the path
  // puts them on the same frame.
  world.addSystem(createFindPathEcsSystem());
  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
      {
        slop: 0.002 * pixelsPerMeter,
        maxBiasSpeed: 3 * pixelsPerMeter,
        restitutionThreshold: pixelsPerMeter,
      },
    ),
  );
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  // The floor's `position.world` includes the map root's position once the
  // transform system has run, so the grid is created after one tick. The
  // game's clock hasn't started, so the tick moves nothing.
  world.update();

  const floorPosition = world.getComponent(floor, positionId);

  if (!floorPosition) {
    throw new Error(`The map "${map.url}" must have a Floor layer.`);
  }

  // A finite map has the cells from (0, 0) to (columns - 1, rows - 1) on
  // every layer. With the map's layout and its origin at the floor's world
  // position, grid cell (c, r) is the layers' cell (c, r).
  const grid = createNavigationGrid({
    cells: {
      minColumn: 0,
      minRow: 0,
      maxColumn: columns - 1,
      maxRow: rows - 1,
    },
    layout,
    origin: floorPosition.world,
  });

  // The cursor picks the goal and the navigation state draws the path to
  // it, so both are on one entity, which the path system queries.
  const demo = world.createEntity();

  addCellCursorComponent(world, demo, {
    camera,
    layer: walls,
    // The walls tileset's stone wall has a `placeable` property in Tiled.
    tile: packTile(findTileWithProperty(map, 'placeable')),
    keepClear: player,
    cells: grid.cells,
  });
  addNavigationDemoComponent(world, demo, {
    grid,
    walls,
    agent: player,
    markers: createPathMarkers(world, map, grid.nodeCount),
  });

  return game;
};
