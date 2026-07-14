import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyId,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export const wallThickness = 40;

/**
 * Creates static rigid bodies for the floor and side walls, bounding the
 * area in which shapes can fall and collide.
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

  const { width, height } = renderContext.canvas;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const createWall = (
    position: Vector2,
    wallWidth: number,
    wallHeight: number,
  ): void => {
    const entity = world.createEntity();

    world.addComponent(entity, positionId, {
      world: position.clone(),
      local: position.clone(),
    });

    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    world.addComponent(entity, scaleId, {
      local: new Vector2(
        wallWidth / wallSprite.width,
        wallHeight / wallSprite.height,
      ),
      world: new Vector2(
        wallWidth / wallSprite.width,
        wallHeight / wallSprite.height,
      ),
    });

    world.addComponent(entity, spriteId, wallSprite);

    world.addComponent(entity, PhysicsBodyId, {
      physicsBody: new RigidBody({
        shape: PolygonShape.rectangle(wallWidth, wallHeight),
        position: position.clone(),
        isStatic: true,
      }),
    });
  };

  createWall(
    new Vector2(0, -halfHeight + wallThickness / 2),
    width,
    wallThickness,
  );

  createWall(
    new Vector2(-halfWidth + wallThickness / 2, 0),
    wallThickness,
    height,
  );

  createWall(
    new Vector2(halfWidth - wallThickness / 2, 0),
    wallThickness,
    height,
  );
}
