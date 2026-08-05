import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export const crateSize = 36;
const gravity = { x: 0, y: -500 };

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ];
}

/**
 * Loads the crate sprite once, up front, so `spawnCrate` (called repeatedly,
 * including from a click handler) never re-triggers an image load.
 * @param renderContext - The render context used to load the crate sprite.
 * @param renderLayer - The render layer crates should be drawn on.
 * @returns The crate sprite, ready to pass into `spawnCrate`.
 */
export async function loadCrateSprite(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<SpriteEcsComponent> {
  const crateImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/physics/block_square.png'),
  );

  return createImageSprite(crateImage, renderContext, renderLayer);
}

/**
 * Spawns a single dynamic crate at `position`, which falls under gravity and
 * lands on (or is pushed by) the kinematic platform.
 * @param world - The ECS world to add the crate entity to.
 * @param sprite - The crate sprite, from `loadCrateSprite`.
 * @param position - The world-space position to spawn the crate at.
 */
export function spawnCrate(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: { ...position },
    local: { ...position },
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, {
    ...sprite,
    width: crateSize,
    height: crateSize,
  });

  const collider = new PolygonCollider(rectangleVertices(crateSize, crateSize));

  addColliderComponent(world, entity, { collider, friction: 0.6 });
  addAabbComponent(world, entity);
  addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
  });
  addGravityComponent(world, entity, { amount: gravity });
}
