import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

export const wallThickness = 40;

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
 * Creates static, non-rigid-body entities for the floor and side walls: a
 * safety net that catches any crate that slides off the platform's edge,
 * and keeps everything within the visible area.
 * @param world - The ECS world to add the boundary entities to.
 * @param camera - The camera entity whose visible area the boundaries enclose.
 * @param renderContext - The render context used to load the wall sprite.
 * @param renderLayer - The render layer the boundaries should be drawn on.
 */
export async function createBoundaries(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const wallSprite = {
    ...createImageSprite(renderContext.whiteTexture, {
      pixelsPerUnit: 1,
    }),
    category: renderLayer,
  };

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const createWall = (
    position: Vector2,
    wallWidth: number,
    wallHeight: number,
  ): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
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
  };

  createWall(
    { x: 0, y: -halfHeight + wallThickness / 2 },
    width,
    wallThickness,
  );

  createWall(
    { x: -halfWidth + wallThickness / 2, y: 0 },
    wallThickness,
    height,
  );

  createWall({ x: halfWidth - wallThickness / 2, y: 0 }, wallThickness, height);
}
