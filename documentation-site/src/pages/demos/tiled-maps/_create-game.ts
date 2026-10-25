import {
  addPositionComponent,
  createTransformEcsSystem,
  positionId,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  colliderId,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  addVisibilityComponent,
  Color,
  createCamera,
  createMeshMaterial,
  createRenderEcsSystem,
  ForgeShaderSource,
  VisibilityEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  createTilemapColliderEcsSystem,
  createTilemapRenderEcsSystem,
  findTiledLayer,
  packTile,
  spawnTiledMap,
  TiledMapCache,
  tilemapLayerId,
} from '@forge-game-engine/forge/tilemaps';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { addCameraFollowComponent } from './_camera-follow.component';
import { createCameraFollowEcsSystem } from './_camera-follow.system';
import { addColliderOutlineComponent } from './_collider-outline.component';
import { createColliderOutlineEcsSystem } from './_collider-outline.system';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
import { createJumpInputEcsSystem } from './_jump-input.system';
import { outlineFragmentShader, outlineVertexShader } from './_outline.shader';
import { createPlayerMoveEcsSystem } from './_player-move.system';
import { createPlayerRespawnEcsSystem } from './_player-respawn.system';
import { addTileToggleComponent } from './_tile-toggle.component';
import { createTileToggleEcsSystem } from './_tile-toggle.system';

/**
 * One tile is 32 Tiled pixels, and one Tiled pixel is one world unit, so
 * physics tuned for meters is scaled by 32.
 */
const pixelsPerMeter = 32;

/** Platformer gravity: about five times Earth's, for short, snappy jumps. */
const gravity = 5.7 * 9.81 * pixelsPerMeter;

/** What the page changes while the demo runs. */
export interface TiledMapsDemo {
  /** Shows or hides the ground layer's collider outline. */
  outlineVisibility: VisibilityEcsComponent;
}

/**
 * Builds the Tiled maps demo: a platformer level loaded from a Tiled map,
 * a player that walks and jumps on the ground layer's collider, and a
 * click that toggles a solid tile in the ground layer.
 * @param mapUrl - The URL of the level's `.tmj` file.
 * @param onReady - Called once the level is built, with what the page
 * changes.
 * @returns The created game.
 */
export const createTiledMapsGame = async (
  mapUrl: string,
  onReady: (demo: TiledMapsDemo) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // Loads the map, its external tileset and the tileset's image, served
  // from the site's static folder with their paths relative to each other.
  const map = await new TiledMapCache(renderContext).getOrLoad(mapUrl);
  const spawned = spawnTiledMap(world, map);
  const ground = findTiledLayer(spawned, 'Ground').entity;
  const water = findTiledLayer(spawned, 'Water').entity;
  const foreground = findTiledLayer(spawned, 'Foreground').entity;

  // Water collides with the shapes its tiles have in Tiled, as a sensor:
  // the player overlaps it instead of standing on it.
  const waterCollider = world.getComponent(water, colliderId);

  if (waterCollider) {
    waterCollider.sensor = true;
  }

  // The player draws after every layer, since it's created after the map.
  // The foreground layer's draw layer puts its tiles in front of it.
  const foregroundLayer = world.getComponent(foreground, tilemapLayerId);

  if (foregroundLayer) {
    foregroundLayer.layer = 1;
  }

  const player = createPlayer(world, map, { ground, water }, gravity);
  const levelWidth = (map.size?.columns ?? 0) * map.tileSet.layout.cellWidth;
  const levelHeight = (map.size?.rows ?? 0) * map.tileSet.layout.cellHeight;
  const camera = createCamera(world, {
    isStatic: true,
    clearColor: map.backgroundColor ?? Color.black,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });
  const cameraPosition = world.getComponent(camera, positionId);

  if (cameraPosition) {
    cameraPosition.local.y = levelHeight / 2;
  }

  addCameraFollowComponent(world, camera, {
    target: player,
    minX: 0,
    maxX: levelWidth,
  });

  // The tileset's stone block has a `placeable` property in Tiled.
  const tileIndex = map.tileSet.sources[0].tiles.findIndex(
    ({ properties }) => properties.placeable === true,
  );

  addTileToggleComponent(world, world.createEntity(), {
    camera,
    layer: ground,
    tile: packTile({ source: 0, tile: tileIndex }),
    keepClear: player,
  });

  renderContext.shaderCache
    .addShader(new ForgeShaderSource(outlineVertexShader))
    .addShader(new ForgeShaderSource(outlineFragmentShader));

  // A child of the ground layer, so its lines are in the layer's local
  // space like the collider's loops. Draw layer 2 puts them over the
  // foreground.
  const outline = world.createEntity();

  addPositionComponent(world, outline);
  world.setParent(outline, ground);
  addColliderOutlineComponent(world, outline, {
    target: ground,
    material: createMeshMaterial(
      renderContext,
      'collider-outline.vert',
      'collider-outline.frag',
    ),
    layer: 2,
  });

  const outlineVisibility = addVisibilityComponent(world, outline, {
    visible: false,
  });

  onReady({ outlineVisibility });

  const { moveInputs, jumpInput, toggleInputs } = createInputs(
    world,
    time,
    game.container,
  );
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // The physics systems run once per fixed step, so the player walks and
  // jumps the same at any frame rate. The transform system comes first, so
  // each step reads the poses the previous step left in `local`. The
  // respawn is a teleport, so it runs before the transform system: the
  // step then finds the player's contacts at the spawn point instead of
  // where it fell.
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createPlayerRespawnEcsSystem(), physics);
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  // Reads the step's contacts, and sets the velocity the solver starts
  // from.
  world.addSystem(
    createPlayerMoveEcsSystem(collisionManifolds, moveInputs),
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
  world.addSystem(createCameraFollowEcsSystem(renderContext));
  // Edits the ground layer before the tilemap systems read it, so a toggled
  // tile draws on the frame it's clicked and collides from the next physics
  // step.
  world.addSystem(createTileToggleEcsSystem(renderContext, toggleInputs));
  world.addSystem(createTilemapColliderEcsSystem());
  world.addSystem(createColliderOutlineEcsSystem(renderContext));
  // Before the transform system, so new chunk entities get their world
  // transform before they're drawn. It reads `time` to play the water.
  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  // A press lasts one frame, so it's read here and handed to the next
  // physics step through the player's `jumpRequested`.
  world.addSystem(createJumpInputEcsSystem(jumpInput));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
