import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  positionId,
  rotationId,
  scaleId,
} from '../../common/components/index.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsWorld } from '../../ecs/index.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { colliderId } from '../../physics/components/collider-component.js';
import { Color } from '../../rendering/color.js';
import { drawOrderId } from '../../rendering/components/draw-order-component.js';
import { visibilityId } from '../../rendering/components/visibility-component.js';
import { setTile } from '../cells/edit-tiles.js';
import { forEachTile, getTile } from '../cells/read-tiles.js';
import { tilemapColliderId } from '../components/tilemap-collider-component.js';
import { tilemapLayerId } from '../components/tilemap-layer-component.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import { findTiledLayer, spawnTiledMap } from './spawn-tiled-map.js';
import {
  createFakeTiledRenderContext,
  fixturesUrl,
  serveFiles,
} from './test-helpers/fake-tiled-files.js';
import { TiledMapCache } from './tiled-map-cache.js';
import type { TiledMap } from './tiled-map.js';

const loadMap = (path: string): Promise<TiledMap> =>
  new TiledMapCache(createFakeTiledRenderContext().renderContext).getOrLoad(
    `${fixturesUrl}${path}`,
  );

describe('spawnTiledMap', () => {
  let world: EcsWorld;
  let map: TiledMap;

  beforeEach(async () => {
    serveFiles();
    world = new EcsWorld();
    map = await loadMap('maps/orthogonal.tmj');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a root at the origin that y-sorts its children', () => {
    const { root } = spawnTiledMap(world, map);

    expect(world.getComponent(root, positionId)?.local).toEqual({
      x: 0,
      y: 0,
    });
    expect(world.getComponent(root, rotationId)?.local).toBe(0);
    expect(world.getComponent(root, scaleId)?.local).toEqual({ x: 1, y: 1 });
    expect(world.getComponent(root, drawOrderId)?.ySortChildren).toBe(true);
  });

  it('parents tile and group layers in Tiled’s order, leaving object layers out', () => {
    const spawned = spawnTiledMap(world, map);
    const ground = findTiledLayer(spawned, 1).entity;
    const buildings = findTiledLayer(spawned, 'Buildings').entity;
    const walls = findTiledLayer(spawned, 'Buildings/Walls').entity;
    const decor = findTiledLayer(spawned, 'Decor').entity;
    const emptyGround = findTiledLayer(spawned, 7).entity;

    expect(world.getChildren(spawned.root)).toEqual([
      ground,
      buildings,
      emptyGround,
    ]);
    expect(world.getChildren(buildings)).toEqual([walls, decor]);
    expect(spawned.layers.map(({ layer }) => layer.path)).toEqual([
      'Ground',
      'Buildings',
      'Buildings/Walls',
      'Buildings/Decor',
      'Ground',
    ]);
  });

  it('sets ySortChildren on every group, and leaves tile layers to the game', () => {
    const spawned = spawnTiledMap(world, map);

    expect(
      world.getComponent(
        findTiledLayer(spawned, 'Buildings').entity,
        drawOrderId,
      )?.ySortChildren,
    ).toBe(true);
    expect(
      world.getComponent(
        findTiledLayer(spawned, 'Buildings/Walls').entity,
        drawOrderId,
      ),
    ).toBeNull();
  });

  it('composes group offsets through the transform hierarchy', () => {
    const spawned = spawnTiledMap(world, map);
    const walls = findTiledLayer(spawned, 'Buildings/Walls').entity;

    world.addSystem(createTransformEcsSystem(new Time()));
    world.update();

    expect(world.getComponent(walls, positionId)?.local).toEqual({
      x: 0,
      y: 16,
    });
    expect(world.getComponent(walls, positionId)?.world).toEqual({
      x: 8,
      y: 12,
    });
  });

  it('fills each tile layer with its tiles in one change', () => {
    const spawned = spawnTiledMap(world, map);
    const ground = world.getComponentRequired(
      findTiledLayer(spawned, 1).entity,
      tilemapLayerId,
    );

    expect(ground.tileSet).toBe(map.tileSet);
    expect(ground.version).toBe(1);
    expect(getTile(ground, 2, 0)).toBe(
      packTile({ source: 0, tile: 0, flipX: true }),
    );
    expect(getTile(ground, 1, 2)).toBe(packTile({ source: 1, tile: 0 }));
    expect(getTile(ground, 2, 1)).toBe(emptyTile);
  });

  it('hides hidden layers, and multiplies groups’ tint and opacity into their tile layers', () => {
    const spawned = spawnTiledMap(world, map);
    const tintOf = (key: string | number): Color =>
      world.getComponentRequired(
        findTiledLayer(spawned, key).entity,
        tilemapLayerId,
      ).tintColor;

    expect(
      world.getComponent(findTiledLayer(spawned, 'Decor').entity, visibilityId)
        ?.visible,
    ).toBe(false);
    expect(
      world.getComponent(
        findTiledLayer(spawned, 'Buildings').entity,
        visibilityId,
      ),
    ).toBeNull();
    expect(tintOf(1)).toEqual(Color.white);
    // The group is red at half opacity; the decor layer is blue at half
    // opacity.
    expect(tintOf('Buildings/Walls')).toEqual(new Color(1, 0, 0, 0.5));
    expect(tintOf('Buildings/Decor')).toEqual(new Color(0, 0, 0, 0.25));
  });

  it('gives every layer with collision tiles a static tile collider, hidden ones too', () => {
    const spawned = spawnTiledMap(world, map);

    const hasCollider = (key: string | number): boolean => {
      const { entity } = findTiledLayer(spawned, key);

      return (
        world.getComponent(entity, colliderId)?.collider instanceof
          ChainCollider &&
        world.getComponent(entity, tilemapColliderId) !== null
      );
    };

    expect(hasCollider(1)).toBe(true);
    expect(hasCollider('Buildings/Walls')).toBe(true);
    expect(hasCollider('Buildings/Decor')).toBe(true);
    expect(hasCollider(7)).toBe(false);
  });

  it('spawns independent copies, and editing one changes neither the other nor the map', () => {
    const first = spawnTiledMap(world, map);
    const second = spawnTiledMap(world, map);
    const firstGround = world.getComponentRequired(
      findTiledLayer(first, 1).entity,
      tilemapLayerId,
    );
    const secondGround = world.getComponentRequired(
      findTiledLayer(second, 1).entity,
      tilemapLayerId,
    );
    const block =
      map.layers[0].kind === 'tiles' ? map.layers[0].blocks[0] : null;
    const before = block ? [...block.tiles] : [];

    expect(second.root).not.toBe(first.root);

    setTile(firstGround, 0, 0, emptyTile);

    expect(getTile(secondGround, 0, 0)).toBe(packTile({ source: 0, tile: 0 }));
    expect(block ? [...block.tiles] : []).toEqual(before);

    const counted: number[] = [];

    forEachTile(secondGround, (_column, _row, tile) => counted.push(tile));
    expect(counted).toHaveLength(9);
  });

  it('spawns an infinite map’s chunks at their cells', async () => {
    const infinite = await loadMap('maps/infinite.tmj');
    const spawned = spawnTiledMap(world, infinite);
    const ground = world.getComponentRequired(
      findTiledLayer(spawned, 'Ground').entity,
      tilemapLayerId,
    );

    expect(getTile(ground, -2, -2)).toBe(packTile({ source: 0, tile: 0 }));
    expect(getTile(ground, -1, -1)).toBe(packTile({ source: 0, tile: 3 }));
    expect(getTile(ground, 1, 0)).toBe(
      packTile({ source: 0, tile: 3, flipX: true }),
    );
  });
});

describe('findTiledLayer', () => {
  let map: TiledMap;

  beforeEach(async () => {
    serveFiles();
    map = await loadMap('maps/orthogonal.tmj');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds a layer by id, path or name', () => {
    const spawned = spawnTiledMap(new EcsWorld(), map);
    const walls = findTiledLayer(spawned, 3);

    expect(walls.layer.path).toBe('Buildings/Walls');
    expect(findTiledLayer(spawned, 'Buildings/Walls')).toBe(walls);
    expect(findTiledLayer(spawned, 'Walls')).toBe(walls);
  });

  it('throws for a name more than one layer has, listing their paths', () => {
    const spawned = spawnTiledMap(new EcsWorld(), map);

    expect(() => findTiledLayer(spawned, 'Ground')).toThrow(
      'Unable to find the Tiled layer "Ground": 2 layers match ("Ground", "Ground"). Use a path or id that names one.',
    );
  });

  it('throws for a layer that is not there, or that made no entity', () => {
    const spawned = spawnTiledMap(new EcsWorld(), map);

    expect(() => findTiledLayer(spawned, 'Roof')).toThrow(
      'Unable to find the Tiled layer "Roof": no tile or group layer of the map has that path or name.',
    );
    expect(() => findTiledLayer(spawned, 5)).toThrow(
      'Unable to find the Tiled layer id 5: no tile or group layer of the map has that id.',
    );
  });
});
