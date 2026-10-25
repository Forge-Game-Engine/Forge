import {
  addPositionComponent,
  createTransformEcsSystem,
  positionId,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
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
import { addCellCursorComponent } from './_cell-cursor.component';
import { createCellCursorEcsSystem } from './_cell-cursor.system';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
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
 * Builds the isometric tilemap demo: a courtyard loaded from a Tiled
 * isometric map, with a floor, a y-sorted layer of walls, crates and trees
 * that a character walks behind and in front of and collides with, and a
 * cursor that highlights the cell under the mouse and toggles a wall in the
 * clicked one.
 * @param mapUrl - The URL of the map's `.tmj` file.
 * @returns The created game.
 */
export const createIsometricTilemapGame = async (
  mapUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // Loads the map, its three external tilesets and their images, served
  // from the site's static folder with their paths relative to each other.
  // The map is isometric, so its tile set's layout is too.
  const map = await new TiledMapCache(renderContext).getOrLoad(mapUrl);
  const spawned = spawnTiledMap(world, map);
  const floor = findTiledLayer(spawned, 'Floor').entity;
  const walls = findTiledLayer(spawned, 'Walls').entity;

  // The map's root already sorts its children by Y. The walls layer sorts
  // its own tiles too, one row of cells at a time, so the player sorts
  // between its rows. The floor isn't y-sorted, and its lower order draws
  // it behind everything, whatever its Y.
  addDrawOrderComponent(world, floor, { order: -1 });
  addDrawOrderComponent(world, walls, { ySortChildren: true });

  // Created after the map, so it draws in front of a row it shares a Y with.
  const player = createPlayer(world, map);

  if (!map.size) {
    throw new Error(`The map "${map.url}" must be finite.`);
  }

  const { columns, rows } = map.size;
  const { layout } = map.tileSet;

  // The map's middle, with the root at the origin, raised by half of how
  // far the tallest tiles reach above their cells, so the back walls fit.
  const middle = layout.cellSpaceToLocal({ x: columns / 2, y: rows / 2 });
  const overhang =
    Math.max(...map.tileSet.sources.map(({ tileHeight }) => tileHeight)) -
    layout.cellHeight;
  const camera = createCamera(world, {
    isStatic: true,
    clearColor: map.backgroundColor ?? Color.black,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    // Sorts the wall rows and the player by their Y.
    ySort: true,
  });
  const cameraPosition = world.getComponent(camera, positionId);

  if (cameraPosition) {
    cameraPosition.local.x = middle.x;
    cameraPosition.local.y = middle.y - overhang / 2;
  }

  // The terrain tileset's cursor tile, a diamond outline, on draw layer 1
  // so it shows over the walls and the player.
  const cursorTile = findTileWithProperty(map, 'cursor');
  const highlight = world.createEntity();

  addPositionComponent(world, highlight);
  addSpriteComponent(world, highlight, {
    ...createAtlasSprite(
      map.tileSet.sources[cursorTile.source].atlas,
      cursorTile.tile,
      { pixelsPerUnit: 1 },
    ),
    layer: 1,
  });
  addVisibilityComponent(world, highlight, { visible: false });

  // The walls tileset's stone wall has a `placeable` property in Tiled.
  addCellCursorComponent(world, world.createEntity(), {
    camera,
    layer: walls,
    highlight,
    tile: packTile(findTileWithProperty(map, 'placeable')),
    keepClear: player,
    columns,
    rows,
  });

  const { moveInput, cursorInputs } = createInputs(world, time, game.container);
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // The physics systems run once per fixed step, so the player walks the
  // same at any frame rate. The transform system comes first, so each step
  // reads the poses the previous step left in `local`.
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createTransformEcsSystem(), physics);
  // Sets the velocity the solver starts from.
  world.addSystem(createPlayerMoveEcsSystem(moveInput), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  // The resolver's defaults are in meters. At 3 units a second the
  // push-out couldn't keep up with a player walking into a wall, which
  // would creep through it.
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
    physics,
  );
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);

  // Once per frame, after the fixed steps.
  // Edits the walls layer before the tilemap systems read it, so a toggled
  // wall draws and sorts on the frame it's clicked, and collides from the
  // next physics step.
  world.addSystem(createCellCursorEcsSystem(renderContext, cursorInputs));
  // The walls' and the water's tiles have collision shapes in Tiled, so
  // both layers have a collider, outlining the diamonds of their tiles.
  world.addSystem(createTilemapColliderEcsSystem());
  // Before the transform system, so new chunk and row entities get their
  // world transform before they're drawn. It reads `time` to play the
  // water.
  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
