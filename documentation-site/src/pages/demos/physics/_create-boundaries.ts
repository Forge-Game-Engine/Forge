import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
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

export const wallThickness = 40;

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    Vec2.create(-halfWidth, -halfHeight),
    Vec2.create(halfWidth, -halfHeight),
    Vec2.create(halfWidth, halfHeight),
    Vec2.create(-halfWidth, halfHeight),
  ];
}

/**
 * Creates static, non-rigid-body entities for the floor and side walls,
 * bounding the area in which shapes can fall and collide.
 * @param world - The ECS world to add the boundary entities to.
 * @param renderContext - The render context used to load the wall sprite.
 * @param renderLayer - The render layer the boundaries should be drawn on.
 */
export async function createBoundaries(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const wallImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const wallSprite = createImageSprite(wallImage, renderContext, renderLayer);

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const createWall = (
    position: Vector2,
    wallWidth: number,
    wallHeight: number,
  ): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: Vec2.clone(position),
      local: Vec2.clone(position),
    });

    addRotationComponent(world, entity);

    addSpriteComponent(world, entity, {
      ...wallSprite,
      width: wallWidth,
      height: wallHeight,
    });

    addColliderComponent(world, entity, {
      collider: new PolygonCollider(rectangleVertices(wallWidth, wallHeight)),
    });
    addAabbComponent(world, entity);
  };

  createWall(
    Vec2.create(0, -halfHeight + wallThickness / 2),
    width,
    wallThickness,
  );

  createWall(
    Vec2.create(-halfWidth + wallThickness / 2, 0),
    wallThickness,
    height,
  );

  createWall(
    Vec2.create(halfWidth - wallThickness / 2, 0),
    wallThickness,
    height,
  );
}
