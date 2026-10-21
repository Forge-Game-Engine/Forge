import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
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

/**
 * The radius of the player's feet, in world units. A circle slides around
 * the corners of the walls' diamonds instead of catching on them.
 */
const footRadius = 9;

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
 * Creates the player from the map's `Player` tile object: its position says
 * where the player starts and its tile is the player's image. In an
 * isometric map, Tiled places a tile object by the bottom center of its
 * image, so the object's position is the player's feet.
 *
 * The entity is at the feet, which is the point a sort unit sorts at, so
 * the sprite's pivot is the object's pivot, and the circle collider is
 * centered there, the part of the player that stands on the floor.
 *
 * The player is a root entity: a dynamic body has to be, since its velocity
 * is in world space. As a root, it sorts by its own Y against each row of
 * the map's y-sorted layer.
 * @param world - The world to create the player in.
 * @param map - The loaded map.
 * @returns The player's entity.
 */
export function createPlayer(world: EcsWorld, map: TiledMap): number {
  const object = findPlayerObject(map);

  if (object.shape.kind !== 'tile') {
    throw new Error('The map\'s "Player" object must be a tile object.');
  }

  const { tile, pivot } = object.shape;
  const { source, tile: tileIndex } = unpackTile(tile);
  const player = world.createEntity();

  addPositionComponent(world, player, {
    local: { x: object.position.x, y: object.position.y },
  });
  addRotationComponent(world, player);
  addSpriteComponent(world, player, {
    // One Tiled pixel is one world unit.
    ...createAtlasSprite(map.tileSet.sources[source].atlas, tileIndex, {
      pixelsPerUnit: 1,
    }),
    pivot: { x: pivot.x, y: pivot.y },
  });
  addColliderComponent(world, player, {
    collider: new CircleCollider(footRadius),
    // Without friction the player slides along a wall it walks into.
    friction: 0,
    restitution: 0,
  });
  addRigidBodyComponent(world, player, { fixedRotation: true });
  addPlayerComponent(world, player, { speed: 160 });

  return player;
}
