import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { degreesToRadians, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addArmComponent } from './_arm.component';

const ballCount = 5;
const ballRadius = 35;
const armLength = 220;
const armWidth = 10;
const startAngle = 0.9;
const gravity = Vec2.create(0, -600);

// `paddle_10.png` is a 640x141 horizontal capsule (rounded caps with a
// flat center); these insets keep its caps at a fixed size while the
// center stretches, instead of smearing them across the frame's width.
const frameSlices: NineSliceOptions = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  nativeWidth: 640,
  nativeHeight: 141,
};

// `block_narrow.png` is a 32x128 rounded, bolted panel; these insets keep
// its rounded corners and bolt-head detail at a fixed size while the center
// stretches, instead of smearing them across each arm's length as it swings.
const armSlices: NineSliceOptions = {
  left: 8,
  right: 8,
  top: 28,
  bottom: 28,
  nativeWidth: 32,
  nativeHeight: 128,
};

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
    frame: createImageSprite(frameImage, renderContext, renderLayer),
    arm: createImageSprite(armImage, renderContext, renderLayer),
  };
}

function createVisualEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  angle: number,
  width: number,
  height: number,
  slices: NineSliceOptions,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });
  addRotationComponent(world, entity, { local: angle, world: angle });
  addSpriteComponent(world, entity, { ...sprite, width, height, slices });
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
  // Balls resting exactly `ballRadius * 2` apart would touch with zero gap,
  // putting all four neighbor contacts in permanent, simultaneous contact.
  // Simultaneous rigid-body contact between a row of equal masses is
  // genuinely indeterminate (real cradles work via an elastic stress wave
  // through the steel, not simultaneous rigid contact) - a sequential-impulse
  // solver resolves it as the whole row moving together rather than ejecting
  // only the last ball. A gap this small (under 1% of `ballRadius`, visually
  // imperceptible) is enough to make each collision a genuinely separate
  // event in time, which is what the classic cradle effect actually depends
  // on.
  const restingGap = 0.3;
  const spacing = ballRadius * 2 + restingGap;
  const frameWidth = spacing * (ballCount - 1) + ballRadius * 3;
  const frameHeight = 100;

  createVisualEntity(
    world,
    sprites.frame,
    center,
    degreesToRadians(0),
    frameWidth,
    frameHeight,
    frameSlices,
  );

  const firstPivotX = center.x - (spacing * (ballCount - 1)) / 2;

  for (let i = 0; i < ballCount; i++) {
    const pivotPosition = Vec2.create(firstPivotX + spacing * i, center.y);
    // Only the leftmost ball starts displaced; the rest hang at rest,
    // touching their neighbors.
    const angle = i === 0 ? -startAngle : 0;
    const localAnchorB = Vec2.create(0, armLength);
    // clone both: pivotPosition and localAnchorB are both reused below unchanged
    // (localAnchorB is also passed as-is to addRevoluteJointComponent).
    const ballPosition = Vec2.subtract(
      Vec2.clone(pivotPosition),
      Vec2.rotate(Vec2.clone(localAnchorB), angle),
    );

    // A static, non-colliding pivot marker: no ColliderEcsComponent (so it
    // never participates in collision detection) and no
    // RigidBodyEcsComponent (so every joint system treats it as static).
    const pivotEntity = world.createEntity();

    addPositionComponent(world, pivotEntity, {
      world: Vec2.clone(pivotPosition),
      local: Vec2.clone(pivotPosition),
    });
    addRotationComponent(world, pivotEntity);

    const ballEntity = world.createEntity();
    const ballCollider = new CircleCollider(ballRadius);

    addPositionComponent(world, ballEntity, {
      world: Vec2.clone(ballPosition),
      local: Vec2.clone(ballPosition),
    });
    addRotationComponent(world, ballEntity, { local: angle, world: angle });
    addSpriteComponent(world, ballEntity, {
      ...sprites.ball,
      width: ballRadius * 2,
      height: ballRadius * 2,
    });
    addColliderComponent(world, ballEntity, {
      collider: ballCollider,
      // A high restitution is what makes the cradle effect read clearly:
      // momentum has to transfer through the row with minimal loss.
      restitution: 0.92,
      friction: 0.05,
    });
    addRigidBodyComponent(world, ballEntity, {
      mass: ballCollider.mass,
      momentOfInertia: ballCollider.momentOfInertia,
    });
    addAabbComponent(world, ballEntity);
    addGravityComponent(world, ballEntity, { amount: gravity });

    const jointEntity = world.createEntity();

    addRevoluteJointComponent(world, jointEntity, {
      entityA: pivotEntity,
      entityB: ballEntity,
      localAnchorB,
    });

    // A nine-sliced sprite, resized and rotated every tick by
    // `createArmEcsSystem` to visualize this ball's otherwise-invisible
    // revolute joint arm back to its pivot.
    const armEntity = world.createEntity();

    addPositionComponent(world, armEntity, {
      world: Vec2.clone(pivotPosition),
      local: Vec2.clone(pivotPosition),
    });
    addRotationComponent(world, armEntity);
    addSpriteComponent(world, armEntity, {
      ...sprites.arm,
      width: armWidth,
      slices: armSlices,
    });
    addArmComponent(world, armEntity, {
      pivotPosition: Vec2.clone(pivotPosition),
      entity: ballEntity,
      armWidth,
    });
  }
}
