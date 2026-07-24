import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  addRevoluteJointComponent,
  CircleShape,
  RevoluteJoint,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addArmLineComponent } from './_arm-line.component';

const ballCount = 5;
const ballRadius = 35;
const armLength = 220;
const armWidth = 8;
const startAngle = 0.9;

const frameColor = Color.white;
const ballColor = Color.white;
const armColor = Color.fromHSLA(0, 0, 60);

// `paddle_10.png` is a native 640x141 capsule; nine-sliced with a left/right
// inset around each rounded end, the frame keeps those caps a fixed size at
// its actual computed width instead of the fixed-regardless-of-ballCount
// half-scale the frame used to be hardcoded to.
const frameCapInset = 66;
const frameNativeWidth = 640;
const frameNativeHeight = 141;

// `block_narrow.png` is a native 32x128 vertical capsule; each arm is drawn
// unrotated with its length along local y, then rotated to point from its
// pivot to its ball, so nine-slicing its top/bottom insets keeps the
// rounded caps a fixed size as the arm's length changes tick to tick.
const armCapInset = 16;
const armNativeWidth = 32;
const armNativeHeight = 128;

interface CradleSprites {
  ball: SpriteEcsComponent;
  frame: SpriteEcsComponent;
  arm: SpriteEcsComponent;
}

async function loadCradleSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CradleSprites> {
  const { imageCache } = renderContext;

  const [ballImage, frameImage, armImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(
      getAssetUrl('img/kenney_puzzle-pack-2/PNG/Paddles/paddle_10.png'),
    ),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    frame: createImageSprite(frameImage, renderContext, renderLayer, {
      slices: {
        left: frameCapInset,
        right: frameCapInset,
        top: 0,
        bottom: 0,
        nativeWidth: frameNativeWidth,
        nativeHeight: frameNativeHeight,
      },
    }),
    arm: createImageSprite(armImage, renderContext, renderLayer, {
      slices: {
        left: 0,
        right: 0,
        top: armCapInset,
        bottom: armCapInset,
        nativeWidth: armNativeWidth,
        nativeHeight: armNativeHeight,
      },
    }),
  };
}

/**
 * Builds a Newton's cradle: `ballCount` balls, each hinged to its own pivot
 * on a shared frame by an arm, spaced so adjacent balls just touch at rest.
 * Each arm is also given a visible rod sprite (see `ArmLineEcsComponent`)
 * spanning its pivot to its ball, kept in sync every tick by
 * `createArmLineEcsSystem` - `RevoluteJoint` itself has no visual
 * representation, only the physical constraint. The leftmost ball starts
 * pulled back and is released exactly once, when the scene is built; from
 * there, ordinary collision resolution between the balls (not the joints)
 * carries the momentum down the row and pops the rightmost ball out, the
 * classic cradle effect.
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

  const frameEntity = world.createEntity();

  addPositionComponent(world, frameEntity, {
    world: center.clone(),
    local: center.clone(),
  });
  addRotationComponent(world, frameEntity, {
    local: degreesToRadians(0),
    world: degreesToRadians(0),
  });
  addSpriteComponent(world, frameEntity, {
    ...sprites.frame,
    width: frameWidth,
    height: frameHeight,
    tintColor: frameColor,
  });

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

    addPositionComponent(world, pivotEntity, {
      world: pivotPosition.clone(),
      local: pivotPosition.clone(),
    });
    addRotationComponent(world, pivotEntity);
    addPhysicsBodyComponent(world, pivotEntity, {
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

    addPositionComponent(world, ballEntity, {
      world: ballPosition.clone(),
      local: ballPosition.clone(),
    });
    addRotationComponent(world, ballEntity, { local: angle, world: angle });
    addScaleComponent(world, ballEntity, {
      local: new Vector2(
        (ballRadius * 2) / sprites.ball.width,
        (ballRadius * 2) / sprites.ball.height,
      ),
      world: new Vector2(
        (ballRadius * 2) / sprites.ball.width,
        (ballRadius * 2) / sprites.ball.height,
      ),
    });
    addSpriteComponent(world, ballEntity, {
      ...sprites.ball,
      tintColor: ballColor,
    });
    addPhysicsBodyComponent(world, ballEntity, { physicsBody: ballBody });

    const joint = new RevoluteJoint({
      bodyA: pivotBody,
      bodyB: ballBody,
      anchorB: localAnchorB,
    });

    const jointEntity = world.createEntity();

    addRevoluteJointComponent(world, jointEntity, { joint });

    const armEntity = world.createEntity();

    addPositionComponent(world, armEntity, {
      world: pivotPosition.clone(),
      local: pivotPosition.clone(),
    });
    addRotationComponent(world, armEntity);
    addSpriteComponent(world, armEntity, {
      ...sprites.arm,
      tintColor: armColor,
    });
    addArmLineComponent(world, armEntity, {
      pivotPosition: pivotPosition.clone(),
      body: ballBody,
      lineWidth: armWidth,
    });
  }
}
