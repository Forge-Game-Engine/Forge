import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
import {
  addRevoluteJointComponent,
  CircleShape,
  PhysicsBodyId,
  RevoluteJoint,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const ballCount = 5;
const ballRadius = 35;
const armLength = 220;
const startAngle = 0.9;

const frameColor = Color.white;
const ballColor = Color.white;

interface CradleSprites {
  ball: SpriteEcsComponent;
  frame: SpriteEcsComponent;
}

async function loadCradleSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CradleSprites> {
  const { imageCache } = renderContext;

  const [ballImage, frameImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(
      getAssetUrl('img/kenney_puzzle-pack-2/PNG/Paddles/paddle_10.png'),
    ),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    frame: createImageSprite(frameImage, renderContext, renderLayer),
  };
}

function createVisualEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  angle: number,
  width: number,
  height: number,
  color: Color,
): void {
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: angle, world: angle });
  world.addComponent(entity, scaleId, {
    local: new Vector2(1, 1),
    world: new Vector2(0.5, 0.5),
  });
  world.addComponent(entity, spriteId, { ...sprite, tintColor: color });
}

/**
 * Builds a Newton's cradle: `ballCount` balls, each hinged to its own pivot
 * on a shared frame by an arm, spaced so adjacent balls just touch at rest.
 * The leftmost ball starts pulled back and is released exactly once, when
 * the scene is built; from there, ordinary collision resolution between the
 * balls (not the joints) carries the momentum down the row and pops the
 * rightmost ball out, the classic cradle effect.
 * @param world - The ECS world to add the cradle's entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the cradle should be drawn on.
 * @param center - The world-space position of the frame's midpoint.
 */
export async function createCradle(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  center: Vector2,
): Promise<void> {
  const sprites = await loadCradleSprites(renderContext, renderLayer);
  const spacing = ballRadius * 2;
  const frameWidth = spacing * (ballCount - 1) + ballRadius * 3;
  const frameHeight = 18;

  createVisualEntity(
    world,
    sprites.frame,
    center,
    degreesToRadians(0),
    frameWidth,
    frameHeight,
    frameColor,
  );

  const firstPivotX = center.x - (spacing * (ballCount - 1)) / 2;

  for (let i = 0; i < ballCount; i++) {
    const pivotPosition = new Vector2(firstPivotX + spacing * i, center.y);
    // Only the leftmost ball starts displaced; the rest hang at rest,
    // touching their neighbors.
    const angle = i === 0 ? -startAngle : 0;
    const localAnchorB = new Vector2(0, armLength);
    const ballPosition = pivotPosition.subtract(localAnchorB.rotate(angle));

    const pivotEntity = world.createEntity();
    const pivotBody = new RigidBody({
      shape: new CircleShape(4),
      position: pivotPosition.clone(),
      isStatic: true,
      isSensor: true,
    });

    world.addComponent(pivotEntity, positionId, {
      world: pivotPosition.clone(),
      local: pivotPosition.clone(),
    });
    world.addComponent(pivotEntity, rotationId, { local: 0, world: 0 });
    world.addComponent(pivotEntity, PhysicsBodyId, {
      physicsBody: pivotBody,
    });

    const ballEntity = world.createEntity();
    const ballBody = new RigidBody({
      shape: new CircleShape(ballRadius),
      position: ballPosition,
      angle,
      // A high restitution is what makes the cradle effect read clearly:
      // momentum has to transfer through the row with minimal loss.
      restitution: 0.92,
      friction: 0.05,
    });

    world.addComponent(ballEntity, positionId, {
      world: ballPosition.clone(),
      local: ballPosition.clone(),
    });
    world.addComponent(ballEntity, rotationId, { local: angle, world: angle });
    world.addComponent(ballEntity, scaleId, {
      local: new Vector2(
        (ballRadius * 2) / sprites.ball.width,
        (ballRadius * 2) / sprites.ball.height,
      ),
      world: new Vector2(
        (ballRadius * 2) / sprites.ball.width,
        (ballRadius * 2) / sprites.ball.height,
      ),
    });
    world.addComponent(ballEntity, spriteId, {
      ...sprites.ball,
      tintColor: ballColor,
    });
    world.addComponent(ballEntity, PhysicsBodyId, { physicsBody: ballBody });

    const joint = new RevoluteJoint({
      bodyA: pivotBody,
      bodyB: ballBody,
      anchorB: localAnchorB,
    });

    const jointEntity = world.createEntity();

    addRevoluteJointComponent(world, jointEntity, { joint });
  }
}
