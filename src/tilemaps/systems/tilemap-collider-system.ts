import { EcsSystem } from '../../ecs/ecs-system.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../../physics/components/collider-component.js';
import { buildTilemapCollisionLoops } from '../collision/build-tilemap-collision-loops.js';
import {
  TilemapColliderEcsComponent,
  tilemapColliderId,
} from '../components/tilemap-collider-component.js';
import {
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '../components/tilemap-layer-component.js';

type WritableTilemapCollider = {
  -readonly [
    K in keyof TilemapColliderEcsComponent
  ]: TilemapColliderEcsComponent[K];
};

const asWritableTilemapCollider = (
  component: TilemapColliderEcsComponent,
): WritableTilemapCollider => component;

/**
 * Creates a system that gives every tilemap layer with a
 * `TilemapColliderEcsComponent` and a `ColliderEcsComponent` one static
 * `ChainCollider` outlining its solid tiles (see
 * `buildTilemapCollisionLoops`). It rebuilds a layer's collider on a tick
 * when the layer's `version` changed, the `TilemapLayerEcsComponent` was
 * replaced, or the collider isn't the one it last wrote; otherwise it does
 * nothing. Several edits in one tick rebuild once.
 *
 * Register it after every system that edits tiles and before
 * `createBroadPhaseEcsSystem`, so an edit collides on the tick it's made.
 * It reads only the layer, in the entity's local space, so it can go
 * before or after `createTransformEcsSystem`.
 * @returns The ECS system.
 */
export const createTilemapColliderEcsSystem = (): EcsSystem<
  [TilemapLayerEcsComponent, TilemapColliderEcsComponent, ColliderEcsComponent]
> => ({
  query: [tilemapLayerId, tilemapColliderId, colliderId],
  update: (_world, { components: [layers, tilemapColliders, colliders] }) => {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const baked = asWritableTilemapCollider(tilemapColliders[i]);
      const collider = colliders[i];

      if (
        baked.bakedLayer === layer &&
        baked.bakedVersion === layer.version &&
        baked.bakedCollider === collider.collider
      ) {
        continue;
      }

      const chain = new ChainCollider(buildTilemapCollisionLoops(layer));

      collider.collider = chain;
      baked.bakedLayer = layer;
      baked.bakedVersion = layer.version;
      baked.bakedCollider = chain;
    }
  },
});
