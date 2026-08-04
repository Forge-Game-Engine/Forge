import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { PlayArea } from './_create-boundaries';
import { paddleId } from './_paddle.component';

const paddleWidthFraction = 0.12;
const paddleHeightFraction = 0.07;
const paddleSpeed = 1_000;
const paddleHeightAboveBottom = 60;

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
 * Creates the player-controlled paddle as a static rigid body - immovable
 * under collision, but still driven by the paddle system's ECS position
 * writes each frame.
 * @param world - The ECS world to add the paddle entity to.
 * @param renderContext - The render context used to load the paddle sprite.
 * @param renderLayer - The render layer the paddle should be drawn on.
 * @param playArea - The bounds the paddle is constrained to move within.
 * @returns The paddle's starting position.
 */
export async function createPaddle(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  playArea: PlayArea,
): Promise<Vector2> {
  const paddleImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/brick-breaker/paddle.png'),
  );
  const paddleSprite = createImageSprite(
    paddleImage,
    renderContext,
    renderLayer,
  );

  const playAreaWidth = playArea.maxX - playArea.minX;
  const paddleWidth = playAreaWidth * paddleWidthFraction;
  const paddleScaleX = paddleWidth / paddleSprite.width;
  const paddleScaleY =
    (playAreaWidth * paddleHeightFraction) / paddleSprite.width;
  const paddleHeight = paddleSprite.height * paddleScaleY;

  const position = Vec2.create(0, playArea.bottomY + paddleHeightAboveBottom);

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: Vec2.clone(position),
    world: Vec2.clone(position),
  });

  addRotationComponent(world, entity);

  addScaleComponent(world, entity, {
    local: Vec2.create(paddleScaleX, paddleScaleY),
    world: Vec2.create(paddleScaleX, paddleScaleY),
  });

  addSpriteComponent(world, entity, paddleSprite);

  world.addComponent(entity, paddleId, {
    speed: paddleSpeed,
    minX: playArea.minX + paddleWidth / 2,
    maxX: playArea.maxX - paddleWidth / 2,
  });

  addColliderComponent(world, entity, {
    collider: new PolygonCollider(rectangleVertices(paddleWidth, paddleHeight)),
    restitution: 1,
    friction: 0,
  });
  addAabbComponent(world, entity);

  return position;
}
