import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addRigidBodyComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addPlatformMoverComponent } from './_platform-mover.component';

export const platformWidth = 260;
export const platformHeight = 32;
export const platformSpeed = 140;

// `block_square.png` is a 64x64 rounded, bolted panel; these insets keep its
// rounded corners and bolt-head detail at a fixed size while the center
// stretches to the platform's actual width, instead of smearing them across
// it (see the same pattern in the prismatic-joint demo).
const platformSlices: NineSliceOptions = {
  left: 16,
  right: 16,
  top: 16,
  bottom: 16,
  nativeWidth: 64,
  nativeHeight: 64,
};

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
 * Creates the demo's kinematic platform: it ping-pongs between `leftX` and
 * `rightX` at `platformY`, carrying and pushing whatever dynamic crates land
 * on it, without gravity or collisions ever changing its own velocity (see
 * `type: 'kinematic'` below, and `_platform-mover.system.ts`, which reverses
 * its direction at the bounds).
 * @param world - The ECS world to add the platform entity to.
 * @param renderContext - The render context used to load the platform sprite.
 * @param renderLayer - The render layer the platform should be drawn on.
 * @param leftX - The leftmost X position the platform travels to.
 * @param rightX - The rightmost X position the platform travels to.
 * @param platformY - The platform's (constant) Y position.
 */
export async function createPlatform(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  leftX: number,
  rightX: number,
  platformY: number,
): Promise<void> {
  const platformImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/physics/block_square.png'),
  );
  const platformSprite = createImageSprite(
    platformImage,
    renderContext,
    renderLayer,
  );

  const entity = world.createEntity();
  const startPosition: Vector2 = { x: leftX, y: platformY };

  addPositionComponent(world, entity, {
    world: { ...startPosition },
    local: { ...startPosition },
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, {
    ...platformSprite,
    width: platformWidth,
    height: platformHeight,
    slices: platformSlices,
  });

  const collider = new PolygonCollider(
    rectangleVertices(platformWidth, platformHeight),
  );

  addColliderComponent(world, entity, { collider, friction: 0.8 });
  addAabbComponent(world, entity);
  addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
    type: 'kinematic',
    velocity: { x: platformSpeed, y: 0 },
  });
  addPlatformMoverComponent(world, entity, {
    leftX,
    rightX,
    speed: platformSpeed,
  });
}
