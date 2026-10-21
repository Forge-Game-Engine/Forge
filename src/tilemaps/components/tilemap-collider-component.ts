import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Collider } from '../../physics/colliders/collider.js';
import { TilemapLayerEcsComponent } from './tilemap-layer-component.js';

/**
 * Keeps the `ColliderEcsComponent` on a tilemap layer's entity in step with
 * the layer's solid tiles, like Unity's `TilemapCollider2D` merged by a
 * `CompositeCollider2D`. Add it, a `TilemapLayerEcsComponent` and a
 * `ColliderEcsComponent` to the same entity and register
 * `createTilemapColliderEcsSystem`.
 *
 * The system then owns the collider component's `collider` field: on any
 * tick the layer changed, it replaces it with a `ChainCollider` built by
 * `buildTilemapCollisionLoops`, and it replaces anything else written there
 * on its next tick. Set `category`, `mask`, `friction`, `restitution` and
 * `sensor` on the `ColliderEcsComponent` as usual; the system never touches
 * them. Tiles that should collide differently (spikes as sensors) go on a
 * layer of their own.
 *
 * Every field is output, written only by the system: what it last built
 * the collider from, so it rebuilds only when something changed.
 */
export interface TilemapColliderEcsComponent {
  /**
   * The layer component the collider was last built from, or `null` before
   * the first build. A different one means the layer was replaced.
   */
  readonly bakedLayer: TilemapLayerEcsComponent | null;

  /** That layer's `version` at the last build, or `-1` before the first. */
  readonly bakedVersion: number;

  /**
   * The `ChainCollider` the system last wrote, or `null` before the first
   * build. If the `ColliderEcsComponent` holds anything else, it rebuilds.
   */
  readonly bakedCollider: Collider | null;
}

/** The component key of {@link TilemapColliderEcsComponent}. */
export const tilemapColliderId =
  createComponentId<TilemapColliderEcsComponent>('tilemapCollider');

/**
 * Attaches a {@link TilemapColliderEcsComponent} to `entity`, with nothing
 * built yet. Give the entity a `TilemapLayerEcsComponent` and a
 * `ColliderEcsComponent` too; start the collider component with
 * `new ChainCollider([])`, which collides with nothing until the system's
 * first tick replaces it.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The tilemap layer's entity.
 * @returns The attached component.
 */
export function addTilemapColliderComponent(
  world: EcsWorld,
  entity: number,
): TilemapColliderEcsComponent {
  return world.addComponent(entity, tilemapColliderId, {
    bakedLayer: null,
    bakedVersion: -1,
    bakedCollider: null,
  });
}
