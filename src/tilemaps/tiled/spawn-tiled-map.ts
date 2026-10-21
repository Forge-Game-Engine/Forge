import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../../common/index.js';
import type { EcsWorld } from '../../ecs/ecs-world.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { addColliderComponent } from '../../physics/components/collider-component.js';
import { Color } from '../../rendering/color.js';
import { addDrawOrderComponent } from '../../rendering/components/draw-order-component.js';
import { addVisibilityComponent } from '../../rendering/components/visibility-component.js';
import { setTileBlock } from '../cells/edit-tiles.js';
import { addTilemapColliderComponent } from '../components/tilemap-collider-component.js';
import { addTilemapLayerComponent } from '../components/tilemap-layer-component.js';
import type {
  TiledGroupLayer,
  TiledLayer,
  TiledMap,
  TiledTileLayer,
} from './tiled-map.js';

/** A tile or group layer's entity. */
export interface SpawnedTiledLayer {
  /** The layer. */
  readonly layer: TiledTileLayer | TiledGroupLayer;

  /** The layer's entity. */
  readonly entity: number;
}

/** The entities {@link spawnTiledMap} created. */
export interface SpawnedTiledMap {
  /** The map's root entity, the parent of its top-level layers' entities. */
  readonly root: number;

  /** Every tile and group layer's entity, in Tiled's order, depth first. */
  readonly layers: readonly SpawnedTiledLayer[];
}

/** Multiplies two colors, with an opacity folded into the alpha. */
const multiplyTint = (tint: Color, color: Color, opacity: number): Color =>
  new Color(
    tint.r * color.r,
    tint.g * color.g,
    tint.b * color.b,
    tint.a * color.a * opacity,
  );

const spawnLayers = (
  world: EcsWorld,
  map: TiledMap,
  layers: readonly TiledLayer[],
  parent: number,
  parentTint: Color,
  spawned: SpawnedTiledLayer[],
): void => {
  for (const layer of layers) {
    // Object layers are data for the game, so they make no entity.
    if (layer.kind === 'objects') {
      continue;
    }

    const entity = world.createEntity();
    const tint = multiplyTint(parentTint, layer.tintColor, layer.opacity);

    world.setParent(entity, parent);
    addPositionComponent(world, entity, {
      local: { x: layer.offset.x, y: layer.offset.y },
    });

    if (!layer.visible) {
      addVisibilityComponent(world, entity, { visible: false });
    }

    spawned.push(Object.freeze({ layer, entity }));

    if (layer.kind === 'group') {
      addDrawOrderComponent(world, entity, { ySortChildren: true });
      spawnLayers(world, map, layer.layers, entity, tint, spawned);

      continue;
    }

    const tilemapLayer = addTilemapLayerComponent(world, entity, {
      tileSet: map.tileSet,
      tintColor: tint,
    });

    for (const block of layer.blocks) {
      setTileBlock(
        tilemapLayer,
        block.column,
        block.row,
        block.columns,
        block.rows,
        block.tiles,
      );
    }

    if (layer.collides) {
      addColliderComponent(world, entity, { collider: new ChainCollider([]) });
      addTilemapColliderComponent(world, entity);
    }
  }
};

/**
 * Creates a loaded Tiled map's entities: a root entity at the origin, and
 * an entity for each tile and group layer, parented to its group's entity
 * (or the root) in Tiled's layer order, so later layers draw on top.
 *
 * - The root has a position, rotation and scale. Move it to move the map.
 *   Scaling it resizes what's drawn but not the colliders, which ignore
 *   scale, so only scale a map that has no colliding layers.
 * - Every layer entity is positioned at the layer's offset from its group,
 *   so offsets compose through the transform hierarchy, and a hidden
 *   layer gets a `VisibilityEcsComponent` that hides it and everything
 *   under it.
 * - A tile layer has a `TilemapLayerEcsComponent` over the map's
 *   `tileSet`, holding the layer's tiles. Its `tintColor` is the layer's
 *   tint and opacity multiplied by every group's above it, as Tiled draws
 *   it.
 * - A tile layer holding any tile with a collision shape also gets a static
 *   `ColliderEcsComponent` and a `TilemapColliderEcsComponent`, so register
 *   `createTilemapColliderEcsSystem`. A hidden layer still collides; remove
 *   those components, or clear the collider's `mask`, to stop it.
 * - The root and every group set `ySortChildren`, so under a camera with
 *   `ySort` a layer whose entity also sets it sorts its tiles against the
 *   game's characters.
 *
 * Object layers make no entities: read their objects from `map.layers`.
 * The map isn't changed, so one map can be spawned any number of times.
 * Find a layer's entity with {@link findTiledLayer}.
 * @param world - The ECS world to create the entities in.
 * @param map - The map, from `TiledMapCache`.
 * @returns The root entity and every tile and group layer's entity.
 */
export function spawnTiledMap(world: EcsWorld, map: TiledMap): SpawnedTiledMap {
  const root = world.createEntity();
  const layers: SpawnedTiledLayer[] = [];

  addPositionComponent(world, root);
  addRotationComponent(world, root);
  addScaleComponent(world, root);
  addDrawOrderComponent(world, root, { ySortChildren: true });
  spawnLayers(world, map, map.layers, root, Color.white, layers);

  return Object.freeze({ root, layers: Object.freeze(layers) });
}

const findMatchingLayers = (
  layers: readonly SpawnedTiledLayer[],
  key: number | string,
): SpawnedTiledLayer[] => {
  if (typeof key === 'number') {
    return layers.filter(({ layer }) => layer.id === key);
  }

  const byPath = layers.filter(({ layer }) => layer.path === key);

  return byPath.length > 0
    ? byPath
    : layers.filter(({ layer }) => layer.name === key);
};

/**
 * Finds a spawned layer by its Tiled id, its path (its groups' names and
 * its own, joined with `'/'`, such as `'Buildings/Walls'`) or its name.
 * @param spawned - The spawned map.
 * @param key - The layer's id, path or name. A string is matched against
 * paths first, then names.
 * @returns The layer and its entity.
 * @throws An error if no tile or group layer matches, or a path or name
 * matches more than one (the message lists their paths).
 */
export function findTiledLayer(
  spawned: SpawnedTiledMap,
  key: number | string,
): SpawnedTiledLayer {
  const matches = findMatchingLayers(spawned.layers, key);

  if (matches.length === 1) {
    return matches[0];
  }

  const described = typeof key === 'number' ? `id ${key}` : `"${key}"`;

  if (matches.length === 0) {
    throw new Error(
      `Unable to find the Tiled layer ${described}: no tile or group layer of the map has that ${typeof key === 'number' ? 'id' : 'path or name'}.`,
    );
  }

  const paths = matches.map(({ layer }) => JSON.stringify(layer.path));

  throw new Error(
    `Unable to find the Tiled layer ${described}: ${matches.length} layers match (${paths.join(', ')}). Use a path or id that names one.`,
  );
}
