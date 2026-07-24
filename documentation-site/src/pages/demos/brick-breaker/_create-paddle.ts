import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  PolygonShape,
  RigidBody,
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

// `paddle.png` is a native 520x140 capsule; nine-sliced with a left/right
// inset around each rounded end, the caps stay a fixed size instead of the
// flattened smear a naive non-uniform stretch leaves once the paddle's
// on-screen aspect ratio (driven by two independent play-area fractions)
// diverges from the artwork's own.
const paddleCapInset = 66;
const paddleNativeWidth = 520;
const paddleNativeHeight = 140;

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
    {
      slices: {
        left: paddleCapInset,
        right: paddleCapInset,
        top: 0,
        bottom: 0,
        nativeWidth: paddleNativeWidth,
        nativeHeight: paddleNativeHeight,
      },
    },
  );

  const playAreaWidth = playArea.maxX - playArea.minX;
  const paddleWidth = playAreaWidth * paddleWidthFraction;
  const paddleHeight =
    (paddleSprite.height / paddleSprite.width) *
    (playAreaWidth * paddleHeightFraction);

  const position = new Vector2(0, playArea.bottomY + paddleHeightAboveBottom);

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: position.clone(),
    world: position.clone(),
  });

  addRotationComponent(world, entity);

  addSpriteComponent(world, entity, {
    ...paddleSprite,
    width: paddleWidth,
    height: paddleHeight,
  });

  world.addComponent(entity, paddleId, {
    speed: paddleSpeed,
    minX: playArea.minX + paddleWidth / 2,
    maxX: playArea.maxX - paddleWidth / 2,
  });

  addPhysicsBodyComponent(world, entity, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(paddleWidth, paddleHeight),
      position: position.clone(),
      isStatic: true,
      restitution: 1,
      friction: 0,
    }),
  });

  return position;
}
