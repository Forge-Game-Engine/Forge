import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { createOrthogonalGridLayout } from '../../math/index.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { CircleCollider } from '../../physics/colliders/circle-collider.js';
import {
  addColliderComponent,
  ColliderEcsComponent,
} from '../../physics/components/collider-component.js';
import { fillTiles, setTile, setTileSet } from '../cells/edit-tiles.js';
import { buildTilemapCollisionLoops } from '../collision/build-tilemap-collision-loops.js';
import {
  addTilemapColliderComponent,
  TilemapColliderEcsComponent,
} from '../components/tilemap-collider-component.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import {
  collisionTestTile,
  createCollisionTestTileSet,
  fullTileIndex,
} from '../test-helpers/create-collision-test-tile-set.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet } from '../tile-set/tile-set.js';
import { packTile } from '../tiles/packed-tile.js';
import { createTilemapColliderEcsSystem } from './tilemap-collider-system.js';

const layout = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });
const full = collisionTestTile(fullTileIndex);

describe('createTilemapColliderEcsSystem', () => {
  let world: EcsWorld;
  let entity: number;
  let layer: TilemapLayerEcsComponent;
  let collider: ColliderEcsComponent;
  let tilemapCollider: TilemapColliderEcsComponent;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTilemapColliderEcsSystem());

    entity = world.createEntity();
    layer = addTilemapLayerComponent(world, entity, {
      tileSet: createCollisionTestTileSet(layout),
    });
    collider = addColliderComponent(world, entity, {
      collider: new ChainCollider([]),
      category: 4,
      mask: 6,
      friction: 0.2,
      restitution: 0.3,
      sensor: true,
    });
    tilemapCollider = addTilemapColliderComponent(world, entity);
  });

  const loopsOf = (component: ColliderEcsComponent): ChainCollider['loops'] =>
    (component.collider as ChainCollider).loops;

  it('starts with nothing built', () => {
    expect(tilemapCollider).toEqual({
      bakedLayer: null,
      bakedVersion: -1,
      bakedCollider: null,
    });
  });

  it('builds the layer’s outline on the first tick', () => {
    fillTiles(layer, 0, 0, 3, 1, full);
    world.update();

    expect(collider.collider).toBeInstanceOf(ChainCollider);
    expect(loopsOf(collider)).toEqual(buildTilemapCollisionLoops(layer));
    expect(tilemapCollider.bakedLayer).toBe(layer);
    expect(tilemapCollider.bakedVersion).toBe(layer.version);
    expect(tilemapCollider.bakedCollider).toBe(collider.collider);
  });

  it('leaves the collider alone on a tick with no change', () => {
    setTile(layer, 0, 0, full);
    world.update();

    const built = collider.collider;

    world.update();

    expect(collider.collider).toBe(built);
  });

  it('rebuilds exactly once for several edits in one tick', () => {
    world.update();

    const before = collider.collider;

    setTile(layer, 0, 0, full);
    setTile(layer, 1, 0, full);
    fillTiles(layer, 0, 1, 2, 1, full);
    world.update();

    const after = collider.collider;

    expect(after).not.toBe(before);
    expect(loopsOf(collider)).toHaveLength(1);
    expect(loopsOf(collider)[0]).toHaveLength(4);

    world.update();

    expect(collider.collider).toBe(after);
  });

  it('gives an emptied layer an empty ChainCollider', () => {
    fillTiles(layer, 0, 0, 2, 2, full);
    world.update();
    fillTiles(layer, 0, 0, 2, 2, 0);
    world.update();

    expect(collider.collider).toBeInstanceOf(ChainCollider);
    expect(loopsOf(collider)).toEqual([]);
  });

  it('rebuilds when the tile set changes', () => {
    setTile(layer, 0, 0, full);
    world.update();

    expect(loopsOf(collider)).toHaveLength(1);

    setTileSet(
      layer,
      createTileSet({ layout, sources: [createTestSource(2, 2)] }),
    );
    world.update();

    expect(loopsOf(collider)).toEqual([]);
  });

  it('rebuilds when the layer is replaced, even at the same version', () => {
    setTile(layer, 0, 0, full);
    world.update();

    // The new layer starts again at version 0 and reaches version 1 with
    // one edit, the version the old layer was built at.
    const replacement = addTilemapLayerComponent(world, entity, {
      tileSet: createCollisionTestTileSet(layout),
    });

    setTile(replacement, 5, 5, full);

    expect(replacement.version).toBe(tilemapCollider.bakedVersion);

    world.update();

    expect(tilemapCollider.bakedLayer).toBe(replacement);
    expect(loopsOf(collider)).toEqual([layout.getCellPolygon(5, 5)]);
  });

  it('replaces a collider written by something else on the next tick', () => {
    setTile(layer, 0, 0, full);
    world.update();

    collider.collider = new CircleCollider(4);
    world.update();

    expect(collider.collider).toBeInstanceOf(ChainCollider);
    expect(loopsOf(collider)).toEqual([layout.getCellPolygon(0, 0)]);
  });

  it('builds into a replaced collider component and keeps its settings', () => {
    setTile(layer, 0, 0, full);
    world.update();

    const replaced = addColliderComponent(world, entity, {
      collider: new ChainCollider([]),
      category: 8,
      friction: 0.9,
      sensor: false,
    });

    world.update();

    expect(loopsOf(replaced)).toEqual([layout.getCellPolygon(0, 0)]);
    expect(replaced).toMatchObject({
      category: 8,
      friction: 0.9,
      sensor: false,
    });
  });

  it('collides an animated tile with the placed tile’s shape, whatever frame shows', () => {
    // Tile 0 collides with its whole cell; its frames show tile 1, which
    // doesn't collide.
    setTileSet(
      layer,
      createTileSet({
        layout,
        sources: [
          createTestSource(2, 1, {
            tiles: new Map([
              [
                0,
                {
                  collision: 'cell',
                  animation: [
                    { tile: 1, durationMilliseconds: 100 },
                    { tile: 0, durationMilliseconds: 100 },
                  ],
                },
              ],
            ]),
          }),
        ],
      }),
    );
    setTile(layer, 0, 0, packTile({ source: 0, tile: 0 }));
    world.update();

    const built = collider.collider;
    const { version } = layer;

    expect(loopsOf(collider)).toEqual([layout.getCellPolygon(0, 0)]);

    // Frames are drawn by the render system and never written to the cells,
    // so the layer's version, and the collider, stay as they are.
    world.update();

    expect(layer.version).toBe(version);
    expect(collider.collider).toBe(built);
  });

  it('never changes the collider’s other settings', () => {
    setTile(layer, 0, 0, full);
    world.update();
    setTile(layer, 1, 0, full);
    world.update();

    expect(collider).toMatchObject({
      category: 4,
      mask: 6,
      friction: 0.2,
      restitution: 0.3,
      sensor: true,
    });
  });
});
