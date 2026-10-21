import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addContactsComponent,
  addGravityComponent,
  addRigidBodyComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createAtlasSprite,
} from '@forge-game-engine/forge/rendering';
import {
  TiledMap,
  TiledObject,
  unpackTile,
} from '@forge-game-engine/forge/tilemaps';
import { addPlayerComponent } from './_player.component';

/** The layer entities the player interacts with. */
export interface PlayerLayers {
  ground: number;
  water: number;
}

/**
 * The player's box, in world units around the center of its tile image.
 * It's narrower than the art, and its corners are cut so it doesn't snag
 * where a slope meets a floor.
 */
const playerShape: Vector2[] = [
  { x: -8, y: -10 },
  { x: -5, y: -13 },
  { x: 5, y: -13 },
  { x: 8, y: -10 },
  { x: 8, y: 14 },
  { x: 6, y: 16 },
  { x: -6, y: 16 },
  { x: -8, y: 14 },
];

/** Finds the object of class `Player` in the map's object layers. */
const findPlayerObject = (map: TiledMap): TiledObject => {
  for (const layer of map.layers) {
    const object =
      layer.kind === 'objects'
        ? layer.objects.find(({ type }) => type === 'Player')
        : undefined;

    if (object) {
      return object;
    }
  }

  throw new Error(`The map "${map.url}" has no object of class "Player".`);
};

/**
 * Creates the player from the map's `Player` tile object: its position
 * says where the player starts and its tile is the player's image. The
 * player is a dynamic body with a box collider, under gravity, and a
 * `ContactsEcsComponent` so the move system can tell when it touches the
 * water.
 *
 * The player is a root entity: a dynamic body has to be, since its velocity
 * is in world space. Created after the map's entities, it draws after the
 * map's layers.
 * @param world - The world to create the player in.
 * @param map - The loaded map.
 * @param layers - The ground and water layers' entities.
 * @param gravity - The player's gravity, in world units a second squared.
 * @returns The player's entity.
 */
export function createPlayer(
  world: EcsWorld,
  map: TiledMap,
  layers: PlayerLayers,
  gravity: number,
): number {
  const object = findPlayerObject(map);

  if (object.shape.kind !== 'tile') {
    throw new Error('The map\'s "Player" object must be a tile object.');
  }

  const { tile, width, height, pivot } = object.shape;
  const { source, tile: tileIndex } = unpackTile(tile);

  // The object's position is its image's pivot, at the bottom-left corner
  // for a tile object in an orthogonal map. The entity is at the image's
  // center, where its sprite and collider are placed.
  const spawn = {
    x: object.position.x + (0.5 - pivot.x) * width,
    y: object.position.y + (0.5 - pivot.y) * height,
  };
  const player = world.createEntity();

  addPositionComponent(world, player, { local: { ...spawn } });
  addRotationComponent(world, player);
  addSpriteComponent(
    world,
    player,
    // One Tiled pixel is one world unit.
    createAtlasSprite(map.tileSet.sources[source].atlas, tileIndex, {
      pixelsPerUnit: 1,
    }),
  );
  addColliderComponent(world, player, {
    collider: new PolygonCollider(playerShape),
    // Without friction the player slides down walls instead of sticking
    // to them; the move system stops it on slopes.
    friction: 0,
    restitution: 0,
  });
  addRigidBodyComponent(world, player);
  addGravityComponent(world, player, { amount: { x: 0, y: gravity } });
  addContactsComponent(world, player);
  addPlayerComponent(world, player, {
    walkSpeed: 220,
    jumpSpeed: 640,
    spawn,
    ground: layers.ground,
    water: layers.water,
    fallLimit: (map.size?.rows ?? 0) * map.tileSet.layout.cellHeight + 200,
  });

  return player;
}
