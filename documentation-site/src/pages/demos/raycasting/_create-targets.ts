import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

interface TargetSpec {
  position: Vector2;
  size: number;
  rotation: number;
  shape: 'circle' | 'square';
}

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

function buildTargets(width: number): TargetSpec[] {
  const halfWidth = width / 2;

  return [
    {
      position: { x: -halfWidth * 0.35, y: 120 },
      size: 70,
      rotation: 0,
      shape: 'circle',
    },
    {
      position: { x: -halfWidth * 0.1, y: -90 },
      size: 90,
      rotation: Math.PI / 6,
      shape: 'square',
    },
    {
      position: { x: halfWidth * 0.2, y: 60 },
      size: 60,
      rotation: 0,
      shape: 'circle',
    },
    {
      position: { x: halfWidth * 0.45, y: -140 },
      size: 100,
      rotation: -Math.PI / 8,
      shape: 'square',
    },
    {
      position: { x: halfWidth * 0.6, y: 160 },
      size: 80,
      rotation: 0,
      shape: 'circle',
    },
  ];
}

/**
 * Creates a fixed arrangement of static circle and square "targets" for the
 * raycasting demo's ray to be cast against. None have a
 * `RigidBodyEcsComponent` - they're immovable scenery, not simulated bodies,
 * so a plain `ColliderEcsComponent` plus `AabbEcsComponent` is all `raycast`
 * needs to see them.
 * @param world - The ECS world to add the target entities to.
 * @param renderContext - The render context used to load target sprites.
 * @param renderLayer - The render layer targets should be drawn on.
 */
export async function createTargets(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const { imageCache } = renderContext;

  const [ballImage, squareImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
  ]);

  const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);
  const squareSprite = createImageSprite(
    squareImage,
    renderContext,
    renderLayer,
  );

  const { x: width } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );

  for (const target of buildTargets(width)) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: Vec2.clone(target.position),
      local: Vec2.clone(target.position),
    });
    addRotationComponent(world, entity, {
      local: target.rotation,
      world: target.rotation,
    });

    const collider: Collider =
      target.shape === 'circle'
        ? new CircleCollider(target.size / 2)
        : new PolygonCollider(rectangleVertices(target.size, target.size));

    addSpriteComponent(world, entity, {
      ...(target.shape === 'circle' ? ballSprite : squareSprite),
      width: target.size,
      height: target.size,
    });
    addColliderComponent(world, entity, { collider });
    addAabbComponent(world, entity);
  }
}
